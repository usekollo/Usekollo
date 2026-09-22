// Object storage for profile photos, on Supabase Storage. SERVER ONLY.
//
// Supabase rather than a separate provider because the project is already
// wired to it for auth and the database: the same URL and service_role key
// this module needs are already configured and validated in lib/env, so there
// is no extra account, credential or env var to keep in step. It also means
// one fewer SDK — this uses the supabase-js client the app already ships.
//
// Uploads go through this route handler rather than straight from the browser
// with a signed URL: avatars are capped at 2MB, so routing the bytes through
// costs little, and it means the file's actual contents can be checked
// server-side instead of trusting a Content-Type the client chose. It also
// avoids configuring CORS on the bucket.
//
// If the size cap ever rises materially, switch to signed upload URLs so the
// bytes bypass the function entirely.

import { randomUUID } from "node:crypto";
import { getEnv } from "@/lib/env";
import { createSupabaseAdmin } from "@/lib/supabase/server";

/** Created by `pnpm storage:setup`: public, 2MB cap, images only. */
const BUCKET = "avatars";

export interface StoredObject {
  key: string;
  url: string;
}

/**
 * Storage rides on the same credentials as the rest of Supabase, so unlike the
 * previous R2 setup there is no separate "is it configured" state — if the app
 * booted at all, `getEnv` already proved these exist.
 */
export function isStorageConfigured(): boolean {
  return true;
}

/** `{SUPABASE_URL}/storage/v1/object/public/{bucket}/` — the public prefix. */
function publicPrefix(): string {
  return `${getEnv().NEXT_PUBLIC_SUPABASE_URL.replace(/\/+$/, "")}/storage/v1/object/public/${BUCKET}/`;
}

export async function putObject(params: {
  key: string;
  body: Buffer;
  contentType: string;
}): Promise<StoredObject> {
  const admin = createSupabaseAdmin();

  const { error } = await admin.storage.from(BUCKET).upload(params.key, params.body, {
    contentType: params.contentType,
    // Every key is unique (see avatarKey), so an object is never rewritten in
    // place and can be cached indefinitely. Replacing an avatar produces a new
    // URL rather than requiring a cache purge.
    cacheControl: "31536000",
    upsert: false,
  });

  if (error) throw new Error(`Could not store that image: ${error.message}`);

  return { key: params.key, url: `${publicPrefix()}${params.key}` };
}

/**
 * Best effort. Deleting the previous avatar keeps the bucket from filling with
 * orphans, but failing to do so must never fail the upload that replaced it.
 */
export async function deleteObject(key: string): Promise<void> {
  try {
    const admin = createSupabaseAdmin();
    const { error } = await admin.storage.from(BUCKET).remove([key]);
    if (error) throw new Error(error.message);
  } catch (error) {
    console.warn("[storage] could not delete object:", key, error);
  }
}

/**
 * Unique per upload, so replacing an avatar yields a new URL and no CDN or
 * browser can serve the old image from cache.
 */
export function avatarKey(userId: string, extension: string): string {
  return `${userId}/${randomUUID()}.${extension}`;
}

/**
 * Recovers the object key from a stored URL, so the previous avatar can be
 * deleted when a new one replaces it.
 *
 * Returns null for anything not served from our own bucket — including the
 * legacy `data:` URLs written before object storage existed, and any R2 URL
 * left over from the previous provider, which this app can no longer delete.
 */
export function keyFromUrl(url: string | null): string | null {
  if (!url) return null;
  const prefix = publicPrefix();
  if (!url.startsWith(prefix)) return null;
  return url.slice(prefix.length) || null;
}
