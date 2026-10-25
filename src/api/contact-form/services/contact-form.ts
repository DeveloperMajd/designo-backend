import type { Strapi } from "@strapi/strapi";
import { buildAdminMail, buildUserMail, type ContactInput } from "../lib/contact";

const SUBMISSION = "api::contact-form.contact-submission";
const DAY_MS = 24 * 60 * 60 * 1000;

type NotificationStatus = "pending" | "sent" | "failed";

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

export default ({ strapi }: { strapi: Strapi }) => {
  // Strapi's email plugin, configured with the nodemailer provider in config/plugins.ts.
  const sendMail = (mail: ReturnType<typeof buildAdminMail> | ReturnType<typeof buildUserMail>) =>
    strapi.plugin("email").service("email").send(mail);

  const setNotificationStatus = (id: number, notificationStatus: NotificationStatus) =>
    strapi.entityService.update(SUBMISSION, id, { data: { notificationStatus } });

  return {
    save(contact: ContactInput) {
      return strapi.entityService.create(SUBMISSION, {
        data: { ...contact, notificationStatus: "pending" },
      });
    },

    /**
     * Emails the site inbox, then sends the visitor a confirmation. It runs after the
     * response has gone out, so it never throws: failures are logged, and the submission
     * records whether the inbox was reached ("failed" ones need a look in the admin panel).
     */
    async notify(id: number, contact: ContactInput) {
      try {
        const inbox = process.env.SMTP_USERNAME;
        if (!inbox || !process.env.SMTP_PASSWORD) {
          strapi.log.error("Contact form: SMTP_USERNAME / SMTP_PASSWORD are not set.");
          await setNotificationStatus(id, "failed");
          return;
        }

        try {
          await sendMail(buildAdminMail(contact, inbox));
          await setNotificationStatus(id, "sent");
        } catch (error) {
          strapi.log.error(`Contact form: emailing the inbox about submission ${id} failed: ${errorMessage(error)}`);
          await setNotificationStatus(id, "failed");
        }

        try {
          await sendMail(buildUserMail(contact.email, inbox));
        } catch (error) {
          strapi.log.warn(`Contact form: the confirmation for submission ${id} was not sent: ${errorMessage(error)}`);
        }
      } catch (error) {
        strapi.log.error(`Contact form: notifying about submission ${id} failed: ${errorMessage(error)}`);
      }
    },

    /**
     * Submissions hold personal data, so they are kept for CONTACT_RETENTION_DAYS (default
     * 180, about six months) and then deleted. Strapi 4's Entity Service has no bulk
     * delete, hence the Query Engine.
     */
    async purgeExpired() {
      const days = Number(process.env.CONTACT_RETENTION_DAYS ?? 180);
      // A typo here must not turn into "delete everything": 0, negative or NaN skips the run.
      if (!Number.isFinite(days) || days < 1) {
        strapi.log.warn(`Contact form: CONTACT_RETENTION_DAYS=${process.env.CONTACT_RETENTION_DAYS} is not a positive number; nothing deleted.`);
        return 0;
      }

      const { count } = await strapi.db.query(SUBMISSION).deleteMany({
        where: { createdAt: { $lt: new Date(Date.now() - days * DAY_MS) } },
      });
      if (count > 0) {
        strapi.log.info(`Contact form: deleted ${count} submission(s) older than ${days} days`);
      }
      return count;
    },
  };
};
