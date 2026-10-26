import type { Strapi } from "@strapi/strapi";

export default {
  // Daily at 04:30 (UTC in the container), after the 03:17 UTC backup.
  purgeExpiredContactSubmissions: {
    task: async ({ strapi }: { strapi: Strapi }) => {
      // Errors must be caught here: node-schedule reports a rejected task by emitting
      // "error" on the job, nothing listens for it, and the resulting unhandled rejection
      // would stop the server.
      try {
        await strapi.service("api::contact-form.contact-form").purgeExpired();
      } catch (error) {
        strapi.log.error(`Contact form: deleting expired submissions failed: ${error instanceof Error ? error.message : error}`);
      }
    },
    options: {
      rule: "30 4 * * *",
    },
  },
};
