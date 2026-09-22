-- Codes this app mints, emails and verifies itself.
--
-- Written by hand rather than generated: `prisma migrate dev` diffs against a
-- shadow database, which has no `auth` schema, so the hand-written
-- rls_and_auth_triggers migration cannot replay there. Applied with
-- `prisma migrate deploy`, which does not use a shadow database.

CREATE TABLE "email_otp" (
    "id"          UUID           NOT NULL DEFAULT gen_random_uuid(),
    "user_id"     UUID           NOT NULL,
    "email"       TEXT           NOT NULL,
    "purpose"     TEXT           NOT NULL,
    "code_hash"   TEXT           NOT NULL,
    "expires_at"  TIMESTAMPTZ(6) NOT NULL,
    "consumed_at" TIMESTAMPTZ(6),
    "attempts"    INTEGER        NOT NULL DEFAULT 0,
    "created_at"  TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_otp_pkey" PRIMARY KEY ("id")
);

-- Verification looks up by the only things the request carries.
CREATE INDEX "email_otp_lookup_idx" ON "email_otp"("email", "purpose", "created_at");
CREATE INDEX "email_otp_user_idx"   ON "email_otp"("user_id");

-- ON UPDATE CASCADE to match the other two foreign keys (see
-- 20260920000200_align_foreign_keys), so `prisma migrate diff` stays clean.
ALTER TABLE "email_otp"
  ADD CONSTRAINT "email_otp_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Every read and write here goes through Prisma or the service role, both of
-- which bypass RLS. Enabling it with no policies is what stops the publishable
-- key — which ships to the browser — reading code hashes directly.
ALTER TABLE "email_otp" ENABLE ROW LEVEL SECURITY;
