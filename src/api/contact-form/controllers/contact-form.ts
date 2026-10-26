import type { Context } from "koa";
import { parseContact } from "../lib/contact";

export default {
  async send(ctx: Context) {
    // Koa's types do not describe the parsed body, and it is untrusted input anyway:
    // parseContact checks every field.
    const { value: contact, error } = parseContact(
      (ctx.request as { body?: unknown }).body
    );
    if (!contact) {
      return ctx.badRequest(error);
    }

    const contactForm = strapi.service("api::contact-form.contact-form");

    // Stored before any email is attempted, so a message is never lost to an SMTP
    // problem. The visitor gets their answer straight away; the emails follow in the
    // background and record on the submission whether they reached the inbox.
    const submission = await contactForm.save(contact);
    void contactForm.notify(submission.id, contact);

    return ctx.send({ success: true });
  },
};
