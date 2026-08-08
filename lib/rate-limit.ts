// Simple in-memory fixed-window rate limiter (section 43).
//
// Honest caveat: this only protects within a single warm server
// instance — on Vercel, concurrent requests can land on different
// instances with separate memory, so it's not a hard guarantee under
// real multi-instance load. For this project's scale (one demo
// deployment, one bot) that's a reasonable trade-off explicitly allowed
// by the spec ("если полноценный rate limiting избыточен — предложи
// простой и разумный вариант"). A Postgres- or Redis-backed counter
// would be the correct upgrade if this ever needs to survive multiple
// concurrent instances.
interface Bucket {
  count: number;
  windowStart: number;
}

const buckets = new Map<string, Bucket>();

export function isRateLimited(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now - bucket.windowStart >= windowMs) {
    buckets.set(key, { count: 1, windowStart: now });
    return false;
  }

  bucket.count += 1;
  return bucket.count > limit;
}
