// ============================================================================
//  billing-checkout.ts — start a Stripe Checkout session for the Teacher plan.
//  POST /api/billing/checkout  { plan: "monthly" | "annual" }
//  Authorization: Bearer <supabase access token>   → { url }
//  The frontend then sends the browser to that URL; Stripe collects payment on
//  its own pages and calls stripe-webhook.ts when the subscription is live.
// ============================================================================
import { stripe, billingConfigured, priceIdFor, userFromRequest, creditsByUserId, json, CORS, siteOrigin } from "./_shared/billing";

export default async function handler(req: Request) {
  if (req.method === "OPTIONS") return new Response("", { status: 204, headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  if (!billingConfigured() || !stripe) {
    // Deployed before the Stripe keys exist — the app falls back to its
    // "paid plans launching soon" message rather than showing an error.
    return json({ error: "Billing is not configured yet.", code: "billing_disabled" }, 503);
  }

  const user = await userFromRequest(req);
  if (!user) return json({ error: "Please sign in first." }, 401);

  let plan = "monthly";
  try {
    const body = await req.json();
    if (body?.plan === "annual") plan = "annual";
  } catch { /* default to monthly */ }

  const price = priceIdFor(plan);
  if (!price) return json({ error: `No Stripe price configured for the ${plan} plan.`, code: "billing_disabled" }, 503);

  try {
    // Reuse the Stripe customer if this teacher has subscribed before, so their
    // billing history stays on one record instead of forking a new customer.
    const existing = await creditsByUserId(user.id);
    const origin = siteOrigin(req);

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price, quantity: 1 }],
      // Both are read by the webhook; client_reference_id is what ties the
      // Stripe session back to the Supabase account that paid.
      client_reference_id: user.id,
      metadata: { supabase_user_id: user.id },
      subscription_data: { metadata: { supabase_user_id: user.id } },
      ...(existing?.stripe_customer_id
        ? { customer: existing.stripe_customer_id }
        : { customer_email: user.email || undefined }),
      allow_promotion_codes: true,
      billing_address_collection: "auto",
      success_url: `${origin}/?checkout=success`,
      cancel_url: `${origin}/?checkout=cancel`,
    });

    if (!session.url) return json({ error: "Stripe did not return a checkout URL." }, 502);
    console.log(`billing-checkout: session ${session.id} (${plan}) for ${user.id}`);
    return json({ url: session.url });
  } catch (e: any) {
    const detail = e?.message || String(e);
    console.error("billing-checkout failed:", detail);
    return json({ error: "Could not start checkout. Please try again." }, 502);
  }
}
