/**
 * Server-to-server auth for scheduled (pg_cron) invocations.
 *
 * The fiscal deadline cron cannot present a Supabase user JWT (RS256 in JWKS),
 * so it authenticates with a dedicated shared secret (`CRON_SHARED_SECRET`).
 * This secret is NOT the service role: it is a random value stored byte-identical
 * in Vault (prod), the Edge Function secrets (prod) and `supabase/functions/.env`
 * + `supabase/seed.sql` (local).
 *
 * Security invariants:
 * - if the env secret is absent/empty -> NEVER authorize (fail closed)
 * - if the bearer token is missing/empty -> reject before any comparison
 * - comparison is constant-time on equal-length non-empty values
 * - the secret and the token are never logged or returned
 */

/**
 * Constant-time string equality.
 *
 * Pure (no Deno.env access at module load) so it is unit-testable under vitest.
 * Returns false for empty strings or mismatched lengths without leaking timing
 * about where the values diverge.
 */
export function constantTimeEquals(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (a.length === 0 || b.length === 0) return false;
  if (a.length !== b.length) return false;

  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function extractBearerToken(req: Request): string | null {
  const authHeader = req.headers.get("authorization");
  if (!authHeader) return null;

  const [scheme, token] = authHeader.split(" ");
  if (scheme !== "Bearer") return null;
  if (!token) return null;

  return token;
}

/**
 * True only when the request carries the exact configured cron shared secret.
 *
 * Fails closed: no env secret => false; no/empty bearer => false.
 */
export function isCronAuthorized(req: Request): boolean {
  const secret = Deno.env.get("CRON_SHARED_SECRET");
  if (!secret) return false;

  const token = extractBearerToken(req);
  if (!token) return false;

  return constantTimeEquals(token, secret);
}
