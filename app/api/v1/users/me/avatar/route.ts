import { requireUser } from "@/lib/api/auth";
import { badRequest, handle, ok } from "@/lib/api/response";
import { validateImage } from "@/lib/storage/images";
import { avatarKey, deleteObject, keyFromUrl, putObject } from "@/lib/storage/objects";
import { createSupabaseAdmin } from "@/lib/supabase/server";

/**
 * Uploads a profile photo to object storage and records its URL.
 *
 * This replaces what the profile form used to do, which was read the file into
 * a base64 `data:` URL and store that in `users.avatar_url` — a text column in
 * Postgres. A 2MB photo became ~2.7MB of text on the user's row, read back on
 * every request that loaded a profile.
 *
 * The bytes are validated by signature, not by the Content-Type the browser
 * claims, because the result is served from our own domain.
 */
export async function POST(request: Request) {
  return handle(async () => {
    const user = await requireUser(request);

    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      throw badRequest("Upload a file as multipart form data.");
    }

    const file = form.get("file");
    if (!(file instanceof File)) {
      throw badRequest("Choose an image to upload.");
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const image = validateImage(file, buffer);

    const stored = await putObject({
      key: avatarKey(user.id, image.extension),
      body: image.buffer,
      contentType: image.mime,
    });

    const admin = createSupabaseAdmin();
    const { data, error } = await admin
      .from("users")
      .update({ avatar_url: stored.url, updated_at: new Date().toISOString() })
      .eq("id", user.id)
      .select("id, full_name, email, avatar_url")
      .single();

    if (error) {
      // The object is already in the bucket but nothing references it, so take
      // it back out rather than leaving an orphan behind.
      await deleteObject(stored.key);
      throw new Error(error.message);
    }

    // Only once the new URL is safely recorded. Doing this earlier would risk
    // deleting the old photo and then failing to save the new one, leaving the
    // user with no avatar at all.
    const previousKey = keyFromUrl(user.avatarUrl);
    if (previousKey && previousKey !== stored.key) {
      await deleteObject(previousKey);
    }

    return ok(
      {
        id: data.id,
        fullName: data.full_name,
        email: data.email,
        avatarUrl: data.avatar_url,
        // Untouched here, but the client replaces the whole ["profile"] cache
        // entry with this response — leaving it out would blank the flag and
        // show a password user the "set a password" panel until the next load.
        hasPassword: user.hasPassword,
      },
      "Photo updated.",
    );
  });
}
