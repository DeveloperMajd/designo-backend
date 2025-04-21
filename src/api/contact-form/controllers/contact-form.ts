import { Context } from "koa";

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

import nodemailer from "nodemailer";

export default {
  async send(ctx: Context) {
    const { name, email, phone, message } = ctx.request.body;

    if (!name || !email || !phone || !message) {
      return ctx.badRequest("All fields are required");
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.SMTP_USERNAME,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    const adminMailOptions = {
      from: email,
      to: process.env.SMTP_USERNAME,
      subject: "New Contact Form Submission",
      html: `
        <h3>New Contact Submission</h3>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Phone:</strong> ${phone}</p>
        <p><strong>Message:</strong><br/>${message}</p>
      `,
    };

    const userMailOptions = {
      from: process.env.SMTP_USERNAME,
      to: email,
      subject: "Thanks for contacting us!",
      html: `
        <h3>Hi ${name},</h3>
        <p>Thanks for reaching out! We’ve received your message and will get back to you soon.</p>
        <hr />
        <p><strong>Your message:</strong></p>
        <p>${message}</p>
      `,
    };

    try {
      await transporter.sendMail(adminMailOptions);
    } catch (error) {
      strapi.log.error("Admin email sending error:", error);
      return ctx.internalServerError("Failed to send to admin.");
    }

    try {
      await transporter.sendMail(userMailOptions);
    } catch (error) {
      strapi.log.error("User email sending error:", error);
      return ctx.badRequest("Your email address appears to be invalid.");
    }

    return ctx.send({ success: true });
  },
};
