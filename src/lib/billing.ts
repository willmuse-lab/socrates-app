// ============================================================================
//  billing.ts — client side of Stripe Checkout.
//
//  There is no Stripe.js and no card form in this app: we ask our own function
//  for a hosted Checkout URL and send the browser there. Card data never
//  touches SocratesIQ. When the teacher comes back, the plan has already been
//  flipped by the webhook (see netlify/functions/stripe-webhook.ts).
//
//  VITE_BILLING_ENABLED is the master switch. Leave it unset and every upgrade
//  button stays hidden and the app behaves exactly as it did before Stripe
//  existed ("paid plans launching soon"). Flip it to true only once the Stripe
//  dashboard is set up AND the Terms have been reviewed — see the handoff.
// ============================================================================
import { supabaseEnabled } from './supabase';

export type BillingPlan = 'monthly' | 'annual';

export const billingEnabled =
  String(import.meta.env.VITE_BILLING_ENABLED ?? '').toLowerCase() === 'true' && supabaseEnabled;

/** The signed-in teacher's access token — proves who is buying, server-side. */
async function accessToken(): Promise<string | null> {
  try {
    const { getAccessToken } = await import('./supabase');
    return await getAccessToken();
  } catch { return null; }
}

async function post(path: string, payload: Record<string, any> = {}): Promise<{ url?: string; error?: string }> {
  const token = await accessToken();
  if (!token) return { error: 'Please sign in first.' };
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  let body: any = {};
  try { body = await res.json(); } catch { /* non-JSON error page */ }
  if (!res.ok) return { error: body?.error || `Something went wrong (${res.status}).` };
  return body;
}

/**
 * Send the teacher to Stripe Checkout. A returned `error` is the only outcome
 * worth acting on — on success the browser has already navigated to Stripe.
 */
export async function startCheckout(plan: BillingPlan = 'monthly'): Promise<{ error?: string }> {
  const body = await post('/api/billing/checkout', { plan });
  if (body.error || !body.url) return { error: body.error || 'Could not start checkout. Please try again.' };
  window.location.href = body.url;
  return {};
}

/** Open Stripe's Customer Portal (update card, invoices, cancel). */
export async function openBillingPortal(): Promise<{ error?: string }> {
  const body = await post('/api/billing/portal');
  if (body.error || !body.url) return { error: body.error || 'Could not open billing.' };
  window.location.href = body.url;
  return {};
}

/**
 * Read (and clear) the ?checkout= marker Stripe sends the teacher back with.
 * Cleared from the URL so a refresh doesn't replay the message.
 */
export function consumeCheckoutReturn(): 'success' | 'cancel' | null {
  try {
    const params = new URLSearchParams(window.location.search);
    const value = params.get('checkout');
    if (value !== 'success' && value !== 'cancel') return null;
    params.delete('checkout');
    const qs = params.toString();
    window.history.replaceState({}, '', window.location.pathname + (qs ? `?${qs}` : '') + window.location.hash);
    return value;
  } catch { return null; }
}
