import type { Context, Next } from "koa";

// Strapi 4 does not sanitize relational filters on the public Content API (CVE-2026-27886,
// fixed only in Strapi 5.37+). An anonymous request that walks from a public relation to
// an admin relation, for example
//   /api/menus?filters[items][updatedBy][resetPasswordToken][$startsWith]=a
// works as a yes/no oracle on admin fields (reset tokens, password hashes) and can end in
// an admin takeover.
//
// The website never queries the admin-owned relations, so any /api request that mentions
// them, or the raw `where` parameter, is rejected outright. The check runs on the decoded
// query string, so it does not depend on how the query is parsed later.
const ADMIN_RELATIONS = /createdby|updatedby|publishedby/i;
const RAW_WHERE_PARAM = /(^|&)where(\[|=|&|$)/i;

export default (_config: unknown, { strapi }: { strapi: any }) =>
  async (ctx: Context, next: Next) => {
    if (ctx.path.startsWith("/api/") && ctx.querystring) {
      let decoded = "";
      let malformed = false;
      try {
        decoded = decodeURIComponent(ctx.querystring.replace(/\+/g, " "));
      } catch {
        malformed = true;
      }

      if (malformed || ADMIN_RELATIONS.test(decoded) || RAW_WHERE_PARAM.test(decoded)) {
        strapi.log.warn(`Blocked a public API query touching admin relations: ${ctx.method} ${ctx.path} from ${ctx.request.ip}`);
        ctx.status = 400;
        ctx.body = {
          data: null,
          error: { status: 400, name: "BadRequestError", message: "Invalid query parameters", details: {} },
        };
        return;
      }
    }

    return next();
  };
