import type { Context, Next } from "koa";
import qs from "qs";
import { describe, expect, it, vi } from "vitest";
import queryGuard from "../../src/middlewares/query-guard";

const warn = vi.fn();
const guard = queryGuard(undefined, { strapi: { log: { warn } } });

const get = async (path: string, querystring = "") => {
  const ctx = {
    path,
    querystring,
    method: "GET",
    request: { ip: "203.0.113.9" },
    status: 404,
    body: undefined as unknown,
  };
  const next = vi.fn(async () => {});
  await guard(ctx as unknown as Context, next as unknown as Next);
  return { ctx, next };
};

// The exact queries the website sends (designo_frontend/src/hooks/getData.ts).
const websiteQueries = {
  page: qs.stringify({
    filters: { Slug: { $eq: "about" } },
    populate: {
      Module: {
        populate: Object.fromEntries(
          ["Elements", "image", "link", "Image", "ImageMobile", "ImageTablet", "locations"].map(
            (field) => [field, { populate: "*" }]
          )
        ),
      },
    },
  }),
  contact: qs.stringify({ populate: { socials: { populate: "*" } } }),
  menus: qs.stringify({ populate: { items: { populate: "*" } } }),
  labels: qs.stringify({ populate: "*" }),
};

describe("query guard", () => {
  it.each(Object.entries(websiteQueries))("lets the website's %s query through", async (_name, query) => {
    const { ctx, next } = await get("/api/pages", query);
    expect(next).toHaveBeenCalled();
    expect(ctx.status).toBe(404);
  });

  it.each([
    "filters[items][updatedBy][resetPasswordToken][$startsWith]=a",
    "filters%5Bitems%5D%5BupdatedBy%5D%5Bpassword%5D%5B%24startsWith%5D=%242",
    "filters[items][updated%42y][id]=1",
    "filters[items][UPDATEDBY][id]=1",
    "populate[createdBy]=*",
    "sort=publishedBy.email",
    "where[id]=1",
    "where=1",
    "locale=en&where[id]=1",
  ])("blocks %s", async (query) => {
    const { ctx, next } = await get("/api/menus", query);
    expect(next).not.toHaveBeenCalled();
    expect(ctx.status).toBe(400);
    expect(ctx.body).toMatchObject({ error: { status: 400, message: "Invalid query parameters" } });
  });

  it("blocks a query string that cannot be decoded", async () => {
    const { ctx, next } = await get("/api/pages", "filters[Slug][$eq]=%E0%A4%A");
    expect(next).not.toHaveBeenCalled();
    expect(ctx.status).toBe(400);
  });

  it("does not mistake a field that merely contains 'where' for the raw parameter", async () => {
    expect((await get("/api/pages", "filters[nowhere][$eq]=x")).next).toHaveBeenCalled();
    expect((await get("/api/pages", "nowhere=1")).next).toHaveBeenCalled();
  });

  it("leaves routes outside the public API alone", async () => {
    const { next } = await get("/admin/content-manager/collection-types/api::page.page", "filters[createdBy][id]=1");
    expect(next).toHaveBeenCalled();
  });

  it("logs what it blocked and from where", async () => {
    warn.mockClear();
    await get("/api/menus", "populate[createdBy]=*");
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("GET /api/menus from 203.0.113.9"));
  });
});
