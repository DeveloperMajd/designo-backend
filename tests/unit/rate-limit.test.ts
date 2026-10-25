import type { Context, Next } from "koa";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import rateLimit from "../../src/api/contact-form/middlewares/rate-limit";

type Middleware = ReturnType<typeof rateLimit>;

const MINUTE = 60 * 1000;

const send = async (middleware: Middleware, ip = "203.0.113.1") => {
  const ctx = { request: { ip }, status: 200, body: undefined as unknown, set: vi.fn() };
  const next = vi.fn(async () => {});
  await middleware(ctx as unknown as Context, next as unknown as Next);
  return { ctx, next };
};

const sendMany = async (middleware: Middleware, count: number, ip?: string) => {
  for (let i = 0; i < count; i++) {
    const { next } = await send(middleware, ip);
    expect(next).toHaveBeenCalled();
  }
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-25T12:00:00Z"));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe("contact-form rate limit", () => {
  it("lets five requests per IP through, then answers 429 with Retry-After", async () => {
    const middleware = rateLimit();
    await sendMany(middleware, 5);

    const { ctx, next } = await send(middleware);
    expect(next).not.toHaveBeenCalled();
    expect(ctx.status).toBe(429);
    expect(ctx.set).toHaveBeenCalledWith("Retry-After", "900");
    expect(ctx.body).toMatchObject({
      error: { status: 429, message: "Too many attempts. Please try again later." },
    });
  });

  it("counts each IP separately", async () => {
    const middleware = rateLimit();
    await sendMany(middleware, 5, "203.0.113.1");

    expect((await send(middleware, "203.0.113.2")).next).toHaveBeenCalled();
  });

  it("counts Retry-After down from the oldest request in the window", async () => {
    const middleware = rateLimit();
    await sendMany(middleware, 5);
    vi.advanceTimersByTime(5 * MINUTE);

    const { ctx } = await send(middleware);
    expect(ctx.set).toHaveBeenCalledWith("Retry-After", "600");
  });

  it("lets the IP in again once the window has passed", async () => {
    const middleware = rateLimit();
    await sendMany(middleware, 5);
    vi.advanceTimersByTime(15 * MINUTE);

    expect((await send(middleware)).next).toHaveBeenCalled();
  });

  it("caps all IPs together at 100 messages a day", async () => {
    const middleware = rateLimit();
    for (let i = 0; i < 20; i++) await sendMany(middleware, 5, `198.51.100.${i}`);

    const { ctx, next } = await send(middleware, "192.0.2.1");
    expect(next).not.toHaveBeenCalled();
    expect(ctx.status).toBe(429);
    expect(ctx.set).toHaveBeenCalledWith("Retry-After", "86400");
    expect(ctx.body).toMatchObject({
      error: { message: "Too many messages today. Please try again tomorrow." },
    });
  });

  it("reads its limits from the environment", async () => {
    vi.stubEnv("CONTACT_RATE_LIMIT_MAX", "2");
    const middleware = rateLimit();
    await sendMany(middleware, 2);

    expect((await send(middleware)).ctx.status).toBe(429);
  });

  it.each(["", "abc", "0", "-3"])(
    "keeps the default limit when CONTACT_RATE_LIMIT_MAX is %j",
    async (value) => {
      vi.stubEnv("CONTACT_RATE_LIMIT_MAX", value);
      const middleware = rateLimit();
      await sendMany(middleware, 5);

      expect((await send(middleware)).ctx.status).toBe(429);
    }
  );
});
