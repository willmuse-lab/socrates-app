// ============================================================================
//  billing-portal.ts — open Stripe's Customer Portal so a teacher can update
//  their card, see invoices, or cancel. POST /api/billing/portal with the
//  Supabase access token → { url }. No plan logic here: whatever they change
//  comes back to us as a webhook event.
//  NOTE: the portal must be turned on once per Stripe mode (test and live) at
//  Dashboard → Settings → Billing → Customer portal → Save.
// ============================================================================
import { stripe, billingConfigured, userFromRequest, creditsByUserId, json, CORS, siteOrigin } from "./_shared/billing";

export default async function handler(req: Request) {
  if (req.method === "OPTIONS") return new Response("", { status: 204, headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  if (!billingConfigured() || !stripe) {
    return json({ error: "Billing is not configured yet.", code: "billing_disabled" }, 503);
  }

  const user = await userFromRequest(req);
  if (!user) return json({ error: "Please sign in first." }, 401);

  const row = await creditsByUserId(user.id);
  if (!row?.stripe_customer_id) {
    return json({ error: "No subscription found for this account.", code: "no_customer" }, 404);
  }

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: row.stripe_customer_id,
      return_url: siteOrigin(req),
    });
    return json({ url: session.url });
  } catch (e: any) {
    const detail = e?.message || String(e);
    console.error("billing-portal failed:", detail);
    // The commonest cause by far is the portal never having been saved once in
    // this Stripe mode — say so plainly in the logs.
    return json({ error: "Could not open the billing portal. Please try again." }, 502);
  }
}
