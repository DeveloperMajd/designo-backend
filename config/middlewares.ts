export default [
  "strapi::logger",
  "strapi::errors",
  "strapi::cors",
  "strapi::poweredBy",
  "strapi::query",
  "strapi::body",
  "strapi::session",
  "strapi::favicon",
  "strapi::public",
  {
    name: "strapi::security",
    config: {
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          "connect-src": ["'self'", "https:"],
          "script-src": ["https://cdnjs.cloudflare.com"],
          "media-src": [
            "https://cdnjs.cloudflare.com",
            "data:",
            "blob:",
            "filesystem:",
            "mediastream:",
            "http://localhost:1337",
          ],
          "img-src": [
            "https://cdnjs.cloudflare.com",
            "data:",
            "blob:",
            "filesystem:",
            "http://localhost:1337",
          ],
        },
      },
    },
  },
];
