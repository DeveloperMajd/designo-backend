export type ContactInput = {
  name: string;
  email: string;
  phone: string;
  message: string;
};

const LIMITS = { name: 100, email: 254, phone: 30, message: 2000 };

const EMAIL_RE = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:"]{2,}$/;
const PHONE_RE = /^[+\d\s().-]{5,30}$/;

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export const escapeHtml = (value: string): string =>
  value.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);

// Escaped first, so the <br/> we add for line breaks is the only markup that survives.
const multiline = (value: string): string =>
  escapeHtml(value).replace(/\r?\n/g, "<br/>");

/**
 * Validates and normalises the request body. Everything the visitor sends ends up in
 * an email, so it is treated as untrusted: strings only, trimmed, length-capped.
 */
export const parseContact = (
  body: unknown
): { value?: ContactInput; error?: string } => {
  const raw = (body ?? {}) as Record<string, unknown>;
  const fields = ["name", "email", "phone", "message"] as const;
  const value = {} as ContactInput;

  for (const field of fields) {
    const entry = raw[field];
    if (typeof entry !== "string" || entry.trim() === "") {
      return { error: "All fields are required" };
    }
    if (entry.trim().length > LIMITS[field]) {
      return { error: `${field} is too long` };
    }
    value[field] = entry.trim();
  }

  if (!EMAIL_RE.test(value.email)) return { error: "Invalid email address" };
  if (!PHONE_RE.test(value.phone)) return { error: "Invalid phone number" };

  return { value };
};

export const buildAdminMail = (contact: ContactInput, inbox: string) => ({
  from: inbox,
  to: inbox,
  // The visitor's address goes in Reply-To, never From: we can only send as `inbox`.
  replyTo: contact.email,
  subject: "New Contact Form Submission",
  html: `
    <h3>New Contact Submission</h3>
    <p><strong>Name:</strong> ${escapeHtml(contact.name)}</p>
    <p><strong>Email:</strong> ${escapeHtml(contact.email)}</p>
    <p><strong>Phone:</strong> ${escapeHtml(contact.phone)}</p>
    <p><strong>Message:</strong><br/>${multiline(contact.message)}</p>
  `,
});

export const buildUserMail = (contact: ContactInput, inbox: string) => ({
  from: inbox,
  to: contact.email,
  subject: "Thanks for contacting us!",
  html: `
    <h3>Hi ${escapeHtml(contact.name)},</h3>
    <p>Thanks for reaching out! We’ve received your message and will get back to you soon.</p>
    <hr />
    <p><strong>Your message:</strong></p>
    <p>${multiline(contact.message)}</p>
  `,
});
