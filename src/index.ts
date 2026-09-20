import type { Strapi } from "@strapi/strapi";

// Endpoints the public website calls without logging in. Granting them here keeps a
// fresh or restored database working without clicking through Users & Permissions.
const PUBLIC_ACTIONS = ["api::contact-form.contact-form.send"];

// The site has no user accounts (content is public and editors use the admin panel, which
// has its own login), so Strapi's public registration, login and password-reset endpoints
// are only attack surface. They are revoked on every boot, so they stay closed even if
// someone re-enables them in the admin.
const CLOSED_PUBLIC_ACTIONS = [
  "plugin::users-permissions.auth.register",
  "plugin::users-permissions.auth.callback",
  "plugin::users-permissions.auth.connect",
  "plugin::users-permissions.auth.forgotPassword",
  "plugin::users-permissions.auth.resetPassword",
  "plugin::users-permissions.auth.emailConfirmation",
  "plugin::users-permissions.auth.sendEmailConfirmation",
];

const ensurePublicPermissions = async (strapi: Strapi) => {
  const role = await strapi
    .query("plugin::users-permissions.role")
    .findOne({ where: { type: "public" } });

  if (!role) {
    strapi.log.warn("Public role not found; skipping public permission setup.");
    return;
  }

  for (const action of PUBLIC_ACTIONS) {
    const existing = await strapi
      .query("plugin::users-permissions.permission")
      .findOne({ where: { action, role: role.id } });

    if (!existing) {
      await strapi
        .query("plugin::users-permissions.permission")
        .create({ data: { action, role: role.id } });
      strapi.log.info(`Granted public permission: ${action}`);
    }
  }

  // Select first, then delete by id: a delete that filters on the role relation makes
  // Strapi emit a multi-table DELETE ... JOIN, which SQLite does not support.
  const permissions = strapi.query("plugin::users-permissions.permission");
  const open = await permissions.findMany({
    where: { action: { $in: CLOSED_PUBLIC_ACTIONS }, role: role.id },
  });

  if (open.length > 0) {
    await permissions.deleteMany({ where: { id: { $in: open.map((p) => p.id) } } });
    strapi.log.info(`Closed ${open.length} unused public auth endpoint(s)`);
  }
};

export default {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register(/*{ strapi }*/) {},

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  async bootstrap({ strapi }: { strapi: Strapi }) {
    await ensurePublicPermissions(strapi);
  },
};
