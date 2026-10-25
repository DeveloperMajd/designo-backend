import type { Strapi } from "@strapi/strapi";
import request from "supertest";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { startStrapi, stopStrapi } from "../helpers/strapi";

const UID = "api::contact-form.contact-submission";

// Every POST in this file counts against the per-IP limit, which is lowered to 4 so the
// last test can reach it. Tests in a file run in order.
const RATE_LIMIT = 4;

let strapi: Strapi;

const message = (email: string) => ({
  name: "Ada Lovelace",
  email,
  phone: "+44 20 7946 0958",
  message: "Hello <b>there</b>",
});

const post = (body: object) =>
  request(strapi.server.httpServer).post("/api/contact-form/send").send(body);

const emailPlugin = () => strapi.plugin("email").service("email");

// The emails go out after the response, so the stored status settles a moment later.
const settledSubmission = (email: string) =>
  vi.waitFor(
    async () => {
      const [submission] = await strapi.db.query(UID).findMany({ where: { email } });
      expect(submission?.notificationStatus).toMatch(/^(sent|failed)$/);
      return submission;
    },
    { timeout: 5000 }
  );

beforeAll(async () => {
  strapi = await startStrapi({ CONTACT_RATE_LIMIT_MAX: String(RATE_LIMIT) });
});

afterAll(async () => {
  await stopStrapi(strapi);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("POST /api/contact-form/send", () => {
  it("stores the message, answers 200 and records that the inbox was emailed", async () => {
    const send = vi.spyOn(emailPlugin(), "send").mockResolvedValue(undefined);

    const res = await post(message("ada@example.com"));

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });
    const submission = await settledSubmission("ada@example.com");
    expect(submission).toMatchObject({
      name: "Ada Lovelace",
      message: "Hello <b>there</b>",
      notificationStatus: "sent",
    });
    expect(send).toHaveBeenCalledTimes(2);
    expect(send.mock.calls[0][0]).toMatchObject({ to: "inbox@example.com", replyTo: "ada@example.com" });
    expect(send.mock.calls[1][0]).toMatchObject({ to: "ada@example.com" });
  });

  it("keeps the message, marked failed, when the inbox cannot be emailed", async () => {
    vi.spyOn(emailPlugin(), "send").mockRejectedValue(new Error("SMTP connection refused"));

    const res = await post(message("grace@example.com"));

    expect(res.status).toBe(200);
    expect(await settledSubmission("grace@example.com")).toMatchObject({ notificationStatus: "failed" });
  });

  it("rejects an invalid message without storing it", async () => {
    const before = await strapi.db.query(UID).count();

    const res = await post({ name: "Ada" });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe("All fields are required");
    expect(await strapi.db.query(UID).count()).toBe(before);
  });

  it("is rate limited per IP", async () => {
    // Three requests above; the fourth is the last one allowed.
    expect((await post({ name: "Ada" })).status).toBe(400);

    const res = await post(message("ada@example.com"));
    expect(res.status).toBe(429);
    expect(res.headers["retry-after"]).toBeDefined();
  });
});

describe("public API", () => {
  it("does not expose contact submissions", async () => {
    const api = request(strapi.server.httpServer);
    expect((await api.get("/api/contact-submissions")).status).toBe(404);
    expect((await api.get("/api/contact-submissions/1")).status).toBe(404);
  });

  it("rejects queries that reach admin relations (CVE-2026-27886 guard)", async () => {
    const res = await request(strapi.server.httpServer).get(
      "/api/menus?filters[items][updatedBy][resetPasswordToken][$startsWith]=a"
    );
    expect(res.status).toBe(400);
  });

  it("keeps the public auth endpoints closed", async () => {
    const res = await request(strapi.server.httpServer)
      .post("/api/auth/local/register")
      .send({ username: "mallory", email: "mallory@example.com", password: "Passw0rd!" });
    expect(res.status).toBe(403);
  });
});
