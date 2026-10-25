import type { Strapi } from "@strapi/strapi";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import createService from "../../src/api/contact-form/services/contact-form";

const UID = "api::contact-form.contact-submission";
const DAY = 24 * 60 * 60 * 1000;

const contact = {
  name: "Ada Lovelace",
  email: "ada@example.com",
  phone: "+44 20 7946 0958",
  message: "Hello",
};

// Just the parts of Strapi the service touches.
const setup = () => {
  const send = vi.fn(async (_mail: object) => undefined);
  const create = vi.fn(async (_uid: string, { data }: { data: object }) => ({ id: 7, ...data }));
  const update = vi.fn(async (_uid: string, _id: number, _params: object) => ({}));
  const deleteMany = vi.fn(async (_params: object) => ({ count: 0 }));
  const log = { error: vi.fn(), warn: vi.fn(), info: vi.fn() };
  const strapi = {
    entityService: { create, update },
    db: { query: vi.fn(() => ({ deleteMany })) },
    plugin: vi.fn(() => ({ service: vi.fn(() => ({ send })) })),
    log,
  };
  const service = createService({ strapi: strapi as unknown as Strapi });
  return { service, send, create, update, deleteMany, log };
};

beforeEach(() => {
  vi.stubEnv("SMTP_USERNAME", "inbox@example.com");
  vi.stubEnv("SMTP_PASSWORD", "app-password");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe("save", () => {
  it("stores the message as pending", async () => {
    const { service, create } = setup();

    const saved = await service.save(contact);

    expect(create).toHaveBeenCalledWith(UID, { data: { ...contact, notificationStatus: "pending" } });
    expect(saved).toMatchObject({ id: 7 });
  });
});

describe("notify", () => {
  it("emails the inbox, records it as sent, then confirms to the visitor", async () => {
    const { service, send, update } = setup();

    await service.notify(7, contact);

    expect(send).toHaveBeenCalledTimes(2);
    expect(send.mock.calls[0][0]).toMatchObject({ to: "inbox@example.com", replyTo: "ada@example.com" });
    expect(send.mock.calls[1][0]).toMatchObject({ to: "ada@example.com" });
    expect(update).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledWith(UID, 7, { data: { notificationStatus: "sent" } });
  });

  it("records a failure, and still confirms, when the inbox email fails", async () => {
    const { service, send, update, log } = setup();
    send.mockRejectedValueOnce(new Error("SMTP connection refused"));

    await service.notify(7, contact);

    expect(update).toHaveBeenCalledWith(UID, 7, { data: { notificationStatus: "failed" } });
    expect(send).toHaveBeenCalledTimes(2);
    expect(log.error).toHaveBeenCalledWith(expect.stringContaining("SMTP connection refused"));
  });

  it("keeps the submission as sent when only the confirmation fails", async () => {
    const { service, send, update, log } = setup();
    send.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error("mailbox unavailable"));

    await service.notify(7, contact);

    expect(update).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledWith(UID, 7, { data: { notificationStatus: "sent" } });
    expect(log.warn).toHaveBeenCalledWith(expect.stringContaining("mailbox unavailable"));
  });

  it.each(["SMTP_USERNAME", "SMTP_PASSWORD"])("sends nothing and records a failure without %s", async (name) => {
    vi.stubEnv(name, "");
    const { service, send, update, log } = setup();

    await service.notify(7, contact);

    expect(send).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalledWith(UID, 7, { data: { notificationStatus: "failed" } });
    expect(log.error).toHaveBeenCalled();
  });

  it("never rejects, even when recording the outcome fails", async () => {
    const { service, update, log } = setup();
    update.mockRejectedValue(new Error("database is locked"));

    await expect(service.notify(7, contact)).resolves.toBeUndefined();
    expect(log.error).toHaveBeenCalledWith(expect.stringContaining("database is locked"));
  });
});

describe("purgeExpired", () => {
  const now = new Date("2026-10-25T12:00:00Z");

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
  });

  it("deletes submissions older than 180 days by default", async () => {
    const { service, deleteMany, log } = setup();
    deleteMany.mockResolvedValueOnce({ count: 3 });

    expect(await service.purgeExpired()).toBe(3);
    expect(deleteMany).toHaveBeenCalledWith({
      where: { createdAt: { $lt: new Date(now.getTime() - 180 * DAY) } },
    });
    expect(log.info).toHaveBeenCalledWith(expect.stringContaining("deleted 3 submission(s)"));
  });

  it("uses CONTACT_RETENTION_DAYS, and the default when it is empty", async () => {
    const { service, deleteMany } = setup();

    vi.stubEnv("CONTACT_RETENTION_DAYS", "30");
    await service.purgeExpired();
    vi.stubEnv("CONTACT_RETENTION_DAYS", "");
    await service.purgeExpired();

    expect(deleteMany.mock.calls.map(([params]) => params)).toEqual([
      { where: { createdAt: { $lt: new Date(now.getTime() - 30 * DAY) } } },
      { where: { createdAt: { $lt: new Date(now.getTime() - 180 * DAY) } } },
    ]);
  });

  it.each(["0", "-7", "six months"])("deletes nothing when CONTACT_RETENTION_DAYS is %j", async (value) => {
    vi.stubEnv("CONTACT_RETENTION_DAYS", value);
    const { service, deleteMany, log } = setup();

    expect(await service.purgeExpired()).toBe(0);
    expect(deleteMany).not.toHaveBeenCalled();
    expect(log.warn).toHaveBeenCalled();
  });
});
