// ============================================================================
//  stripe-webhook.ts — the ONLY thing that changes a teacher's plan.
//  POST /api/stripe/webhook (Stripe calls this; never the browser).
//
//  Flow: teacher pays on Stripe's page → Stripe posts checkout.session.completed
//  here → we flip user_credits.plan to 'paid' (15 redesigns a month). Renewals
//  reset the month's counter; a cancellation that actually ends drops them back
//  to 'trial'. Comped ('unlimited') accounts are never touched.
//
//  Every handler is idempotent: Stripe retries delivery, and a repeat of the
//  same event just rewrites the same row with the same values.
// ============================================================================
import { stripe, billingConfigured, creditsByCustomerId, updateCredits, tsOrNull, json } from "./_shared/billing";

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || "";

// The period end moved onto subscription items in recent Stripe API versions;
// read whichever this account's version sends.
function periodEndOf(sub: any): string | null {
  return tsOrNull(sub?.current_period_end ?? sub?.items?.data?.[0]?.current_period_end ?? null);
}

// invoice.subscription (classic) vs invoice.parent.subscription_details (newer).
function subscriptionIdOf(invoice: any): string | null {
  const direct = invoice?.subscription;
  if (typeof direct === "string") return direct;
  const nested = invoice?.parent?.subscription_details?.subscription;
  return typeof nested === "string" ? nested : null;
}

/** Map a Stripe subscription onto our two access states. */
function planForStatus(status: string): "paid" | "trial" {
  // past_due / unpaid keep access while Stripe retries the card — losing the
  // tool mid-lesson over a temporary card decline is the wrong call. Access
  // ends when Stripe finally deletes the subscription.
  return ["active", "trialing", "past_due", "unpaid"].includes(status) ? "paid" : "trial";
}

/** Find the Supabase account behind a subscription/session. */
async function userIdFor(obj: any): Promise<string | null> {
  const fromMeta = obj?.metadata?.supabase_user_id || obj?.client_reference_id;
  if (typeof fromMeta === "string" && fromMeta) return fromMeta;
  const customer = typeof obj?.customer === "string" ? obj.customer : obj?.customer?.id;
  if (!customer) return null;
  const row = await creditsByCustomerId(customer);
  return row?.user_id ?? null;
}

export default async function handler(req: Request) {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!billingConfigured() || !stripe || !WEBHOOK_SECRET) {
    console.warn("stripe-webhook: billing not configured; ignoring event");
    return json({ received: true, ignored: "not_configured" });
  }

  // Signature verification needs the EXACT raw body — never req.json() here.
  const raw = await req.text();
  const signature = req.headers.get("stripe-signature") || "";
  let event: any;
  try {
    event = await stripe.webhooks.constructEventAsync(raw, signature, WEBHOOK_SECRET);
  } catch (e: any) {
    // A bad signature means the request did not come from Stripe. 400 tells
    // Stripe to stop retrying a payload we will never accept.
    console.error("stripe-webhook: signature check failed:", e?.message || e);
    return json({ error: "Invalid signature" }, 400);
  }

  try {
    switch (event.type) {
      // ---- The purchase itself ---------------------------------------------
      case "checkout.session.completed": {
        const session = event.data.object;
        if (session.mode !== "subscription") break;
        const userId = await userIdFor(session);
        if (!userId) { console.error("stripe-webhook: no supabase user on session", session.id); break; }
        const subId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
        // Nice-to-have detail (status, period end). If this call fails we still
        // grant the plan — the teacher has paid, and customer.subscription.*
        // events fill the same fields in moments anyway.
        let sub: any = null;
        try {
          if (subId) sub = await stripe.subscriptions.retrieve(subId);
        } catch (e: any) {
          console.warn("stripe-webhook: could not read subscription", subId, e?.message || e);
        }
        await updateCredits(userId, {
          plan: "paid",
          // A fresh paid month starts now, so the first 15 are available
          // immediately regardless of what the trial had used.
          used: 0,
          period_start: new Date().toISOString().slice(0, 10),
          stripe_customer_id: typeof session.customer === "string" ? session.customer : session.customer?.id ?? null,
          stripe_subscription_id: subId ?? null,
          subscription_status: sub?.status ?? "active",
          cancel_at_period_end: !!sub?.cancel_at_period_end,
          current_period_end: periodEndOf(sub),
        });
        console.log(`stripe-webhook: ${userId} upgraded to paid (${subId})`);
        break;
      }

      // ---- Plan/status changes (upgrades, cancellations, card trouble) ------
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object;
        const userId = await userIdFor(sub);
        if (!userId) { console.error("stripe-webhook: no supabase user on subscription", sub.id); break; }
        const deleted = event.type === "customer.subscription.deleted";
        const plan = deleted ? "trial" : planForStatus(sub.status);
        await updateCredits(userId, {
          plan,
          // `used` is deliberately NOT reset on a downgrade — see updateCredits.
          stripe_customer_id: typeof sub.customer === "string" ? sub.customer : sub.customer?.id ?? null,
          stripe_subscription_id: sub.id,
          subscription_status: deleted ? "canceled" : sub.status,
          cancel_at_period_end: !!sub.cancel_at_period_end,
          current_period_end: periodEndOf(sub),
        });
        // "requested" because updateCredits refuses to demote a comped account.
        console.log(`stripe-webhook: ${userId} → ${plan} requested (${event.type}, status ${sub.status})`);
        break;
      }

      // ---- Renewal: start the next month's 15 --------------------------------
      case "invoice.paid": {
        const invoice = event.data.object;
        if (!subscriptionIdOf(invoice)) break;             // one-off invoice, not us
        if (invoice.billing_reason === "subscription_create") break; // handled above
        const userId = await userIdFor(invoice);
        if (!userId) break;
        await updateCredits(userId, {
          plan: "paid",
          used: 0,
          period_start: new Date().toISOString().slice(0, 10),
          subscription_status: "active",
        });
        console.log(`stripe-webhook: ${userId} renewed, month reset`);
        break;
      }

      // ---- Card trouble: record it, don't cut them off ----------------------
      case "invoice.payment_failed": {
        const invoice = event.data.object;
        const userId = await userIdFor(invoice);
        if (!userId) break;
        await updateCredits(userId, { subscription_status: "past_due" });
        console.log(`stripe-webhook: ${userId} payment failed (kept on paid while Stripe retries)`);
        break;
      }

      default:
        // Everything else Stripe sends is fine to ignore.
        break;
    }
  } catch (e: any) {
    // Answer 500 so Stripe retries: a dropped event would leave a paying
    // teacher stuck on the trial wall.
    console.error(`stripe-webhook: handling ${event?.type} failed:`, e?.message || e);
    return json({ error: "Handler failed" }, 500);
  }

  return json({ received: true });
}
