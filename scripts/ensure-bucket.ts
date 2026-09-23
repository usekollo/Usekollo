// Creates the avatars bucket if it is not there. Idempotent — safe to re-run,
// and safe against a project that already has it.
//
//   pnpm storage:setup
//
// Wrapped in a main() rather than using top-level await: tsx loads a .ts file
// as CommonJS, where top-level await fails with ERR_REQUIRE_ASYNC_MODULE.
import { createClient } from "@supabase/supabase-js";
import { getEnv } from "../src/lib/env";

const BUCKET = "avatars";

async function main(): Promise<void> {
  const env = getEnv();
  const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const { data: existing } = await admin.storage.getBucket(BUCKET);

  if (existing) {
    console.log(`bucket "${BUCKET}" already exists (public: ${existing.public})`);
    return;
  }

  const { error } = await admin.storage.createBucket(BUCKET, {
    public: true,
    // Mirrors the caps enforced in lib/storage/images, so an oversized or
    // non-image upload is refused by the storage API too rather than relying
    // on the route being the only way in.
    fileSizeLimit: 2 * 1024 * 1024,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
  });

  if (error) throw new Error(`could not create bucket: ${error.message}`);
  console.log(`bucket "${BUCKET}" created`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
