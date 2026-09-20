// Comma-separated list of frontend origins allowed to call the API from a browser.
// Production sets this in .env; the default only covers local development.
const corsOrigins = (process.env.CORS_ORIGINS ?? "http://localhost:3000")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

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
