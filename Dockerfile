# syntax=docker/dockerfile:1

# ---- build: install everything, compile TypeScript, build the admin panel ----
FROM node:20-bookworm AS build
WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --network-timeout 600000

COPY . .

# The admin panel bakes the public URL in at build time (config/server.ts), so a
# different URL needs a rebuild.
ARG PUBLIC_URL
ENV PUBLIC_URL=${PUBLIC_URL} NODE_ENV=production
RUN yarn build

# Dev dependencies are deliberately kept. They are only the @types packages, which is
# a few MB, and Strapi's CLI (admin:reset-user-password, export, transfer, ...) recompiles
# the TypeScript project and fails without them, even though the server itself runs from
# the prebuilt dist/.
RUN yarn cache clean

# ---- runtime ----
FROM node:20-bookworm-slim
ENV NODE_ENV=production
WORKDIR /app

COPY --from=build --chown=node:node /app ./

# The two paths docker-compose mounts as volumes. Creating them here as `node` makes
# a fresh volume inherit that ownership, so Strapi can write to it.
RUN mkdir -p data public/uploads && chown -R node:node data public/uploads

USER node
EXPOSE 1337

HEALTHCHECK --interval=30s --timeout=5s --start-period=90s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:1337/_health').then(r=>process.exit(r.status===204?0:1)).catch(()=>process.exit(1))"

CMD ["node_modules/.bin/strapi", "start"]
