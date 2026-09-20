// Comma-separated list of frontend origins allowed to call the API from a browser.
// Production sets this in .env / docker-compose; the default only covers local development.
const corsOrigins = (process.env.CORS_ORIGINS ?? "http://localhost:3000")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

// The admin panel is served by this same server, so its requests carry the server's
// own URL as their Origin and would be rejected ("... is not a valid origin") unless it
// is allowed too. PUBLIC_URL in production, localhost while developing.
const ownOrigins = process.env.PUBLIC_URL
  ? [process.env.PUBLIC_URL]
  : [
      `http://localhost:${process.env.PORT ?? 1337}`,
      `http://127.0.0.1:${process.env.PORT ?? 1337}`,
    ];

for (const url of ownOrigins) {
  try {
    corsOrigins.push(new URL(url).origin);
  } catch {
    // a malformed URL must not stop the server from booting
  }
}

export default [
  "strapi::errors",
  "strapi::security",
  {
    name: "strapi::cors",
    config: {
      origin: corsOrigins,
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      headers: "*",
    },
  },
  "strapi::poweredBy",
  "strapi::logger",
  "strapi::query",
  "strapi::body",
  "strapi::session",
  "strapi::favicon",
  "strapi::public",
];
