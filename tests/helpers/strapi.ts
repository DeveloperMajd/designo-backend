import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import type { Strapi } from "@strapi/strapi";

// Strapi 4's ESM build cannot be loaded by Node's ESM loader (it imports "lodash/fp" as a
// directory), so the CommonJS build, the one `strapi start` runs, is required instead.
const require = createRequire(path.join(process.cwd(), "package.json"));
const strapiFactory: typeof import("@strapi/strapi").default = require("@strapi/strapi");

const dbFile = `.tmp/test-${process.pid}.sqlite`;

// Every value is set explicitly, so neither a local .env nor missing CI secrets change the
// outcome (dotenv never overrides what is already in the environment). SMTP credentials
// are present so the contact form gets as far as the email plugin, which tests replace.
const testEnv = {
  NODE_ENV: "test",
  APP_KEYS: "testKeyOne,testKeyTwo",
  API_TOKEN_SALT: "test-api-token-salt",
  ADMIN_JWT_SECRET: "test-admin-jwt-secret",
  TRANSFER_TOKEN_SALT: "test-transfer-token-salt",
  JWT_SECRET: "test-jwt-secret",
  DATABASE_CLIENT: "sqlite",
  DATABASE_FILENAME: dbFile,
  SMTP_USERNAME: "inbox@example.com",
  SMTP_PASSWORD: "test-password",
  STRAPI_TELEMETRY_DISABLED: "true",
  STRAPI_DISABLE_UPDATE_NOTIFICATION: "true",
};

type Listener = (...args: unknown[]) => void;

// Strapi's destroy() ends with process.removeAllListeners(), which also removes the test
// runner's own listeners (its IPC channel to the worker) and kills the worker. The
// listeners that existed before Strapi booted are put back afterwards.
let runnerListeners: [string | symbol, Listener[]][] = [];

/** Boots the real app, without listening on a port, against an empty throwaway database. */
export async function startStrapi(env: Record<string, string> = {}): Promise<Strapi> {
  fs.rmSync(path.resolve(dbFile), { force: true });
  Object.assign(process.env, testEnv, env);
  runnerListeners = process
    .eventNames()
    .map((event) => [event, process.rawListeners(event) as Listener[]]);

  const appContext = await strapiFactory.compile();
  const app = await strapiFactory(appContext).load();
  await app.server.mount();
  return app;
}

export async function stopStrapi(app: Strapi | undefined) {
  await app?.destroy();
  for (const [event, listeners] of runnerListeners) {
    for (const listener of listeners) process.on(event as string, listener);
  }
  fs.rmSync(path.resolve(dbFile), { force: true });
}
