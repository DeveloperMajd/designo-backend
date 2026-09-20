import type { Strapi } from "@strapi/strapi";

// Endpoints the public website calls without logging in. Granting them here keeps a
// fresh or restored database working without clicking through Users & Permissions.
const PUBLIC_ACTIONS = ["api::contact-form.contact-form.send"];

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
