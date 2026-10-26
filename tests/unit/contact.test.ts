import { describe, expect, it } from "vitest";
import {
  buildAdminMail,
  buildUserMail,
  escapeHtml,
  parseContact,
} from "../../src/api/contact-form/lib/contact";

const valid = {
  name: "Ada Lovelace",
  email: "ada@example.com",
  phone: "+44 20 7946 0958",
  message: "Hello",
};

describe("parseContact", () => {
  it("accepts a valid message and trims every field", () => {
    expect(
      parseContact({
        name: "  Ada  ",
        email: " ada@example.com ",
        phone: " +44 20 7946 0958 ",
        message: " Hi \n",
      })
    ).toEqual({
      value: { name: "Ada", email: "ada@example.com", phone: "+44 20 7946 0958", message: "Hi" },
    });
  });

  it.each(["name", "email", "phone", "message"] as const)("requires %s", (field) => {
    expect(parseContact({ ...valid, [field]: undefined })).toEqual({ error: "All fields are required" });
    expect(parseContact({ ...valid, [field]: "   " })).toEqual({ error: "All fields are required" });
  });

  it("rejects values that are not strings", () => {
    expect(parseContact({ ...valid, name: 42 })).toEqual({ error: "All fields are required" });
    expect(parseContact({ ...valid, message: ["Hello"] })).toEqual({ error: "All fields are required" });
  });

  it.each([undefined, null, "text", 7])("rejects a body that is not an object (%j)", (body) => {
    expect(parseContact(body)).toEqual({ error: "All fields are required" });
  });

  it.each([
    ["name", "a".repeat(100)],
    ["email", `${"a".repeat(242)}@example.com`],
    ["phone", `+${"1".repeat(29)}`],
    ["message", "a".repeat(2000)],
  ] as const)("accepts %s at its length limit and rejects one character more", (field, longest) => {
    expect(parseContact({ ...valid, [field]: longest }).value?.[field]).toBe(longest);
    expect(parseContact({ ...valid, [field]: `${longest}1` })).toEqual({ error: `${field} is too long` });
  });

  it.each(["plainaddress", "ada@localhost", "ada lovelace@example.com", "<ada>@example.com"])(
    "rejects the email address %j",
    (email) => {
      expect(parseContact({ ...valid, email })).toEqual({ error: "Invalid email address" });
    }
  );

  it.each(["1234", "call me", "+49 30 1234567 ext. 2"])("rejects the phone number %j", (phone) => {
    expect(parseContact({ ...valid, phone })).toEqual({ error: "Invalid phone number" });
  });
});

describe("escapeHtml", () => {
  it("escapes the five HTML-significant characters", () => {
    expect(escapeHtml(`<a href="x">Tom & 'Jerry'</a>`)).toBe(
      "&lt;a href=&quot;x&quot;&gt;Tom &amp; &#39;Jerry&#39;&lt;/a&gt;"
    );
  });
});

describe("buildAdminMail", () => {
  const contact = {
    name: "<b>Eve</b>",
    email: "eve@example.com",
    phone: "+1 555 0100",
    message: "line one\n<script>alert(1)</script>",
  };
  const mail = buildAdminMail(contact, "inbox@example.com");

  it("is sent from and to the site inbox, with the visitor only in Reply-To", () => {
    expect(mail).toMatchObject({
      from: "inbox@example.com",
      to: "inbox@example.com",
      replyTo: "eve@example.com",
    });
  });

  it("escapes everything the visitor wrote and keeps their line breaks", () => {
    expect(mail.html).toContain("&lt;b&gt;Eve&lt;/b&gt;");
    expect(mail.html).toContain("line one<br/>&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(mail.html).not.toContain("<script>");
  });
});

describe("buildUserMail", () => {
  // The visitor's text is not even a parameter; this pins down that nothing else about
  // the recipient leaks into the content either.
  it("goes to the visitor with the same fixed text for everyone", () => {
    const { to: toAda, ...forAda } = buildUserMail("ada@example.com", "inbox@example.com");
    const { to: toEve, ...forEve } = buildUserMail("eve@evil.example", "inbox@example.com");

    expect(toAda).toBe("ada@example.com");
    expect(toEve).toBe("eve@evil.example");
    expect(forAda).toEqual(forEve);
    expect(forAda.from).toBe("inbox@example.com");
  });
});
