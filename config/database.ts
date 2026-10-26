import path from "path";

// Every environment runs SQLite: a Docker volume in production, a copy of the seed
// snapshot locally. Postgres stays available as an option.
export default ({ env }) => {
  const client = env("DATABASE_CLIENT", "sqlite");

  const connections = {
    postgres: {
      connection: {
        connectionString: env("DATABASE_URL"),
        host: env("DATABASE_HOST", "localhost"),
        port: env.int("DATABASE_PORT", 5432),
        database: env("DATABASE_NAME", "designodb"),
        user: env("DATABASE_USERNAME", "designo_user"),
        password: env("DATABASE_PASSWORD"),
        // The server certificate is verified unless that is explicitly turned off.
        ssl: env.bool("DATABASE_SSL", true) && {
          rejectUnauthorized: env.bool(
            "DATABASE_SSL_REJECT_UNAUTHORIZED",
            true
          ),
        },
        schema: env("DATABASE_SCHEMA", "public"),
      },
      pool: {
        min: env.int("DATABASE_POOL_MIN", 2),
        max: env.int("DATABASE_POOL_MAX", 10),
      },
    },
    sqlite: {
      connection: {
        // Relative to the app root. The default is the local working copy, never the
        // committed snapshot (.tmp/data.db), which is only ever copied.
        filename: path.join(
          __dirname,
          "..",
          "..",
          env("DATABASE_FILENAME", ".tmp/local.sqlite")
        ),
      },
      useNullAsDefault: true,
    },
  };

  return {
    connection: {
      client,
      ...connections[client],
      acquireConnectionTimeout: env.int("DATABASE_CONNECTION_TIMEOUT", 60000),
    },
  };
};
