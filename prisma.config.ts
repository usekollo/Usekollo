import { defineConfig, env } from "prisma/config";

// Prisma 7 does not load .env by itself. Node 22 can, natively, so this needs
// no dotenv dependency. Import statements are hoisted but this call still runs
// before the defineConfig(...) argument below is evaluated, which is where
// env() actually reads.
//
// On Vercel there is no .env on disk and the variables are already set, so a
// failure here is expected rather than fatal.
try {
  process.loadEnvFile();
} catch {
  // Nothing to load — the environment is already populated.
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // DIRECT_URL, not DATABASE_URL: migrations are one long session doing DDL,
    // and the transaction pooler on 6543 cannot carry the session state that
    // depends on. DATABASE_URL is the runtime connection and is handed to
    // PrismaClient as a driver adapter instead.
    url: env("DIRECT_URL"),
  },
});
