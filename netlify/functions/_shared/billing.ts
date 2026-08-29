// ============================================================================
//  billing.ts — shared plumbing for the three Stripe functions
//  (billing-checkout, billing-portal, stripe-webhook).
//
//  Design notes:
//  - Stripe HOSTED Checkout, so no card data ever touches this app or its
//    server. We create a session, redirect, and let Stripe do the rest.
//  - The subscription is the source of truth for BILLING; `user_credits.plan`
//    is the source of truth for ACCESS. The webhook is the only thing that
//    moves a teacher between them, using the service-role key (RLS gives
//    teachers SELECT-only, so they can never upgrade themselves).
//  - Everything is optional: with no STRIPE_* env vars set, the functions
//    answer 503 and the app keeps its pre-Stripe "plans launching soon"
//    behaviour. Nothing breaks by deploying this before the keys exist.
// ============================================================================
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";
// Server-side ONLY. Bypasses RLS — never expose this as a VITE_ variable, it
// would be baked into the frontend bundle.
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || "";

export const stripe = STRIPE_SECRET_KEY
  ? new Stripe(STRIPE_SECRET_KEY, { maxNetworkRetries: 2, timeout: 20000 })
  : null;

export const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

export const json = (body: any, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: CORS });

/** The Stripe Price for a plan choice. Set in Netlify env from the dashboard. */
export function priceIdFor(plan: string): string {
  return (plan === "annual" ? process.env.STRIPE_PRICE_ANNUAL : process.env.STRIPE_PRICE_MONTHLY) || "";
}

/** Is billing wired up at all? Used to answer 503 instead of throwing. */
export function billingConfigured(): boolean {
  return !!(stripe && SUPABASE_URL && SERVICE_ROLE_KEY);
}

/**
 * Identify the caller from their Supabase access token. The token is verified
 * by Supabase itself (a forged one fails), so this is a real authorisation
 * check, not a trust-the-client id.
 */
export async function userFromRequest(req: Request): Promise<{ id: string; email: string | null } | null> {
  const auth = req.headers.get("authorization") || req.headers.get("Authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!token || !SUPABASE_URL || !ANON_KEY) return null;
  try {
    const sb = createClient(SUPABASE_URL, ANON_KEY);
    const { data, error } = await sb.auth.getUser(token);
    if (error || !data?.user) return null;
    return { id: data.user.id, email: data.user.email ?? null };
  } catch {
    return null;
  }
}

/** Service-role client. Bypasses RLS — server-side use only. */
export function adminClient() {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return null;
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export interface CreditsRow {
  user_id: string;
  plan: string;
  used: number;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
}

/** The teacher's credits row, creating nothing — null when they have none yet. */
export async function creditsByUserId(userId: string): Promise<CreditsRow | null> {
  const sb = adminClient();
  if (!sb) return null;
  const { data } = await sb.from("user_credits").select("*").eq("user_id", userId).maybeSingle();
  return (data as CreditsRow) || null;
}

/** Reverse lookup for webhook events that only carry a Stripe customer id. */
export async function creditsByCustomerId(customerId: string): Promise<CreditsRow | null> {
  const sb = adminClient();
  if (!sb) return null;
  const { data } = await sb.from("user_credits").select("*").eq("stripe_customer_id", customerId).maybeSingle();
  return (data as CreditsRow) || null;
}

/**
 * Write plan/subscription state for one teacher.
 *
 * Two rules live here and nowhere else:
 *  1. A 'unlimited' (comped/staff/beta) account is NEVER touched — a Stripe
 *     event must not quietly demote someone Will granted a free ride.
 *  2. Downgrades do NOT reset `used`. Otherwise cancelling and re-subscribing
 *     would be a way to farm free redesigns.
 */
export async function updateCredits(userId: string, patch: Record<string, any>): Promise<void> {
  const sb = adminClient();
  if (!sb) return;
  const current = await creditsByUserId(userId);
  if (current?.plan === "unlimited" && patch.plan && patch.plan !== "unlimited") {
    console.log("billing: leaving unlimited account alone", userId);
    delete patch.plan;
  }
  const row = { user_id: userId, ...patch, updated_at: new Date().toISOString() };
  // Upsert, because a teacher who has never analysed anything has no row yet
  // (get_assignment_credits creates it lazily) and can still buy a plan.
  const { error } = await sb.from("user_credits").upsert(row, { onConflict: "user_id" });
  // THROW, don't just log. A swallowed failure here means a teacher paid and
  // silently stayed on the trial wall. Throwing makes the webhook answer 500,
  // which shows up in Stripe's dashboard and gets retried for up to 3 days --
  // so a payment taken before migration-stripe.sql was run still lands once
  // the columns exist.
  if (error) throw new Error(`credits update failed: ${error.message}`);
}

/** ISO timestamp from a Stripe unix seconds field, or null. */
export const tsOrNull = (seconds: number | null | undefined) =>
  typeof seconds === "number" ? new Date(seconds * 1000).toISOString() : null;

/**
 * Where to send the teacher back to after Checkout / the billing portal.
 *
 * Never echo an arbitrary Origin header back into a Stripe redirect URL — that
 * is an open redirect. We accept the request's origin only when it is one of
 * ours (the live domain, or any Netlify deploy preview so previews are
 * testable), and otherwise fall back to the site URL Netlify injects.
 */
export function siteOrigin(req: Request): string {
  const fallback = process.env.SITE_URL || process.env.URL || process.env.DEPLOY_PRIME_URL || "https://socratesiq.com";
  const origin = req.headers.get("origin") || "";
  try {
    const u = new URL(origin);
    const ok =
      u.protocol === "https:" &&
      (u.hostname === "socratesiq.com" ||
        u.hostname === "www.socratesiq.com" ||
        u.hostname.endsWith(".netlify.app"));
    if (ok) return u.origin;
  } catch { /* no or malformed Origin header — use the fallback */ }
  return fallback.replace(/\/$/, "");
}
