import { Context } from "koa";
import nodemailer from "nodemailer";
import { buildAdminMail, buildUserMail, parseContact } from "../lib/contact";

// Extend the Request interface to include the 'body' property
declare module "koa" {
  interface Request {
    body: {
      name: string;
      email: string;
      phone: string;
      message: string;
    };
  }
}

let transporter: nodemailer.Transporter | undefined;

const getTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.SMTP_USERNAME,
        pass: process.env.SMTP_PASSWORD,
      },
    });
  }
  return transporter;
};

export default {
  async send(ctx: Context) {
    const { value: contact, error } = parseContact(ctx.request.body);
    if (!contact) {
      return ctx.badRequest(error);
    }

    const inbox = process.env.SMTP_USERNAME;
    if (!inbox || !process.env.SMTP_PASSWORD) {
      strapi.log.error("Contact form: SMTP_USERNAME / SMTP_PASSWORD are not set.");
      return ctx.internalServerError("Failed to send to admin.");
    }

    try {
      await getTransporter().sendMail(buildAdminMail(contact, inbox));
    } catch (error) {
      strapi.log.error("Admin email sending error:", error);
      return ctx.internalServerError("Failed to send to admin.");
    }

    try {
      await getTransporter().sendMail(buildUserMail(contact, inbox));
    } catch (error) {
      strapi.log.error("User email sending error:", error);
      return ctx.badRequest("Your email address appears to be invalid.");
    }

    return ctx.send({ success: true });
  },
};
