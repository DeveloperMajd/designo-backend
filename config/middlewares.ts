export default [
  "strapi::errors",
  "strapi::security",
  {
    name: "strapi::cors",
    config: {
      origin: [
        'https://designo-frontend.vercel.app',   
        'https://designo-backend.developermajd.com',
 	'https://designo-frontend.developermajd.com',
      ],
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
