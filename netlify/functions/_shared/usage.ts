// ============================================================================
//  usage.ts — best-effort usage/analytics logging for the Netlify functions.
//  Writes one row per AI call to Supabase's usage_events table. NEVER logs
//  assignment/lesson content — only token counts, cost, and metadata.
//  Designed to be non-blocking and failure-proof: a logging error must never
//  break or meaningfully delay an analysis (short timeout, all errors swallowed).
// ============================================================================
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";
const sb = SUPABASE_URL && SUPABASE_KEY ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;

// Claude Haiku 4.5 pricing (per token). Input $1.00 / output $5.00 per 1M;
// cache read ~0.1x input, cache write (5-min ephemeral) 1.25x input.
const PRICE = {
  input: 1.0 / 1_000_000,
  output: 5.0 / 1_000_000,
  cacheRead: 0.1 / 1_000_000,
  cacheWrite: 1.25 / 1_000_000,
};

export function costUsd(u: any): number {
  if (!u) return 0;
  const inp = u.input_tokens || 0;
  const out = u.output_tokens || 0;
  const cr = u.cache_read_input_tokens || 0;
  const cw = u.cache_creation_input_tokens || 0;
  return inp * PRICE.input + out * PRICE.output + cr * PRICE.cacheRead + cw * PRICE.cacheWrite;
}

export interface UsageRow {
  user_id?: string | null;
  anon_id?: string | null;
  event_type: string;
  request_group?: string | null;
  model?: string | null;
  input_tokens?: number | null;
  output_tokens?: number | null;
  cache_read_tokens?: number | null;
  cache_write_tokens?: number | null;
  cost_usd?: number | null;
  ai_strategy?: string | null;
  subject?: string | null;
  grade_level?: string | null;
  duration_ms?: number | null;
  status?: string;
  error_detail?: string | null;
}

// Fire-and-await with a hard cap so it never eats the function's time budget.
export async function logUsage(row: UsageRow): Promise<void> {
  if (!sb) return;
  try {
    await Promise.race([
      sb.from("usage_events").insert(row),
      new Promise((resolve) => setTimeout(resolve, 2500)),
    ]);
  } catch (e) {
    // Never let logging break the request.
    console.warn("usage log skipped:", (e as any)?.message || e);
  }
}

// Build a usage row from a Claude response's `usage` object.
export function usageFromResponse(u: any) {
  return {
    model: "claude-haiku-4-5",
    input_tokens: u?.input_tokens ?? null,
    output_tokens: u?.output_tokens ?? null,
    cache_read_tokens: u?.cache_read_input_tokens ?? null,
    cache_write_tokens: u?.cache_creation_input_tokens ?? null,
    cost_usd: costUsd(u),
  };
}
