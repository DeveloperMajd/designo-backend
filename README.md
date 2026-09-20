# Designo — Backend

Headless CMS for the Designo agency website. Strapi 4.20 (TypeScript) serving a REST
API to the [Next.js frontend](https://github.com/DeveloperMajd/designo-frontend).

- API: <https://api.designo.developermajd.com/api/pages>
- Site: <https://designo.developermajd.com>

## What it provides

- **Page** collection: a slug, a title and a dynamic zone of reusable components
  (banners, project grids, locations, contact form, ...). The frontend maps each
  component to a React section and renders them in the order the editor chose.
- **Label**, **Contact** (single type) and menus (`strapi-plugin-menus`).
- `POST /api/contact-form/send`: sends the contact-form email through Gmail. It
  validates every field, HTML-escapes what it puts in the emails, uses `Reply-To`
  instead of a spoofed `From`, and is rate limited (5 requests per 15 minutes per IP
  plus a global cap of 100 per day, all overridable through env vars).
- On boot it grants the Public role the contact-form permission, so a fresh or
  restored database works without clicking through the admin.

## Run locally

Needs **Node 18-20** (Strapi 4.20 does not support newer versions).

The easiest way is the `Makefile` in the parent [designo](https://github.com/DeveloperMajd/designo)
repo: `make dev` starts this backend and the frontend together.

Standalone:

```bash
yarn install
cp .env.example .env                     # placeholder secrets are fine locally
cp .tmp/data.db .tmp/local.sqlite        # .tmp/data.db is the committed content snapshot
DATABASE_CLIENT=sqlite DATABASE_FILENAME=.tmp/local.sqlite yarn dev
```

Admin panel: <http://localhost:1337/admin>. Work on the copy, not on `.tmp/data.db`,
so the snapshot in git stays clean.

## Deployment

Runs as a Docker container on an Oracle Cloud Always Free ARM VM, behind a shared Caddy
reverse proxy that handles HTTPS. SQLite and the media library live in Docker volumes
(`strapi-data`, `strapi-uploads`).

```bash
# on the server, in this directory
git pull
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
```

- **Secrets** go in `.env` (see `.env.production.example`). Everything else is in
  `docker-compose.prod.yml`.
- **`PUBLIC_URL` is a build argument.** The admin panel bakes it in, so changing the
  URL needs a rebuild, not just a restart.
- The container joins the external Docker network `web`; Caddy proxies
  `api.designo.developermajd.com` to `designo-backend:1337`. Nothing is published on
  the host.

Useful operations:

```bash
# reset an admin password (the CLI recompiles TypeScript, which is why the image keeps @types/*)
docker exec designo-backend node_modules/.bin/strapi admin:reset-user-password \
  --email you@example.com --password 'NewPassw0rd'

# back up the database and the uploads
docker run --rm -v designo_strapi-data:/d -v "$PWD":/b alpine tar czf /b/designo-data.tgz -C /d .
docker run --rm -v designo_strapi-uploads:/d -v "$PWD":/b alpine tar czf /b/designo-uploads.tgz -C /d .
```

## Configuration

| Variable | Purpose |
| --- | --- |
| `APP_KEYS`, `API_TOKEN_SALT`, `ADMIN_JWT_SECRET`, `TRANSFER_TOKEN_SALT`, `JWT_SECRET` | Strapi secrets (required) |
| `PUBLIC_URL` | Public URL of the API, e.g. `https://api.designo.developermajd.com` |
| `IS_PROXIED` | `true` behind a reverse proxy, so Strapi trusts `X-Forwarded-*` and sees real client IPs |
| `CORS_ORIGINS` | Comma-separated frontend origins allowed by CORS (default `http://localhost:3000`) |
| `DATABASE_CLIENT`, `DATABASE_FILENAME` | `sqlite` and a path relative to the app root (Postgres also works, see `config/database.ts`) |
| `SMTP_USERNAME`, `SMTP_PASSWORD` | Gmail account (app password) that sends the contact-form emails |
| `CONTACT_RATE_LIMIT_MAX`, `CONTACT_RATE_LIMIT_WINDOW_MS`, `CONTACT_DAILY_CAP` | Contact-form limits |
