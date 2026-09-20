import type { Context, Next } from "koa";

const DAY_MS = 24 * 60 * 60 * 1000;

// The contact form is public and every accepted request sends two emails from the
// site's Gmail account, so it is limited per client IP and by a global daily cap.
// State is in memory: it resets on restart, which is fine for a single container.
export default () => {
  const windowMs = Number(process.env.CONTACT_RATE_LIMIT_WINDOW_MS ?? 15 * 60 * 1000);
  const maxPerWindow = Number(process.env.CONTACT_RATE_LIMIT_MAX ?? 5);
  const maxPerDay = Number(process.env.CONTACT_DAILY_CAP ?? 100);

  const hitsByIp = new Map<string, number[]>();
  let dailyHits: number[] = [];

  const recent = (hits: number[], now: number, span: number) =>
    hits.filter((time) => now - time < span);

  const reject = (ctx: Context, retryAfterMs: number, message: string) => {
    ctx.set("Retry-After", String(Math.ceil(retryAfterMs / 1000)));
    ctx.status = 429;
    ctx.body = {
      data: null,
      error: { status: 429, name: "TooManyRequestsError", message, details: {} },
    };
  };

  return async (ctx: Context, next: Next) => {
    const now = Date.now();

    // Drop idle IPs so the map cannot grow without bound.
    if (hitsByIp.size > 1000) {
      for (const [ip, hits] of hitsByIp) {
        if (recent(hits, now, windowMs).length === 0) hitsByIp.delete(ip);
      }
    }

    dailyHits = recent(dailyHits, now, DAY_MS);
    if (dailyHits.length >= maxPerDay) {
      return reject(ctx, DAY_MS - (now - dailyHits[0]), "Too many messages today. Please try again tomorrow.");
    }

    // ctx.request.ip is the real client IP when the server runs with `proxy: true`.
    const ip = ctx.request.ip;
    const ipHits = recent(hitsByIp.get(ip) ?? [], now, windowMs);
    if (ipHits.length >= maxPerWindow) {
      return reject(ctx, windowMs - (now - ipHits[0]), "Too many attempts. Please try again later.");
    }

    ipHits.push(now);
    hitsByIp.set(ip, ipHits);
    dailyHits.push(now);

    return next();
  };
};
