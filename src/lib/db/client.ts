// Server-side Prisma client. SERVER ONLY — this opens a direct Postgres
// connection with credentials that must never reach the browser.
//
// Prisma 7 no longer reads a connection URL from schema.prisma, so the two
// connections are wired in two different places:
//   - migrations  -> DIRECT_URL (session pooler, 5432) via prisma.config.ts
//   - runtime     -> DATABASE_URL (transaction pooler, 6543) via the adapter
//                    below
//
// Note this bypasses row level security exactly as createSupabaseAdmin does:
// it authenticates as the database role, not as the signed-in user. Anything
// that needs RLS enforced has to go through supabase-js with the anon key.
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { getEnv } from "@/lib/env";

// `next dev` re-evaluates this module on every edit. Without stashing the
// client on globalThis each reload would leak its connections and Postgres
// would eventually refuse new ones.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient(): PrismaClient {
  const connectionString = getEnv().DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set — Prisma cannot open a connection. " +
        "See .env.example.",
    );
  }

  return new PrismaClient({
    // One connection per function instance: the transaction pooler already
    // does the pooling, and opening more here just consumes its slots.
    adapter: new PrismaPg({ connectionString, max: 1 }),
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
