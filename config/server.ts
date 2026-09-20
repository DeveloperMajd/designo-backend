export default ({ env }) => ({
  host: env('HOST', '0.0.0.0'),
  port: env.int('PORT', 1337),
  // Public URL, e.g. https://api.designo.developermajd.com. The admin panel bakes
  // this in at build time, so it must also be set when running `strapi build`.
  url: env('PUBLIC_URL', ''),
  // Trust X-Forwarded-* from the reverse proxy (Caddy) in production so Strapi
  // sees the real client IP and the https scheme. Leave off for local dev.
  proxy: env.bool('IS_PROXIED', false),
  app: {
    keys: env.array('APP_KEYS'),
  },
  webhooks: {
    populateRelations: env.bool('WEBHOOKS_POPULATE_RELATIONS', false),
  },
});
