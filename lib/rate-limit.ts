type RateLimitRecord = {
  count: number;
  time: number;
};

const store = new Map<string, RateLimitRecord>();

export function getClientIp(req: Request) {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  const realIp = req.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }

  return "unknown";
}

export function checkRateLimit(key: string, maxRequests: number, windowMs: number) {
  const now = Date.now();
  const existing = store.get(key);

  if (!existing) {
    store.set(key, { count: 1, time: now });
    return { ok: true, remaining: maxRequests - 1 };
  }

  if (now - existing.time > windowMs) {
    store.set(key, { count: 1, time: now });
    return { ok: true, remaining: maxRequests - 1 };
  }

  if (existing.count >= maxRequests) {
    return { ok: false, remaining: 0 };
  }

  existing.count += 1;
  store.set(key, existing);

  return { ok: true, remaining: Math.max(0, maxRequests - existing.count) };
}