-- Sign-in throttling.
--
-- Supabase rate limits by caller IP, but every sign-in reaches it from this
-- server, so all attempts share one address and that limit never fires for a
-- single attacker. This table is where the real caller is still visible.

CREATE TABLE "login_attempts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "scope" TEXT NOT NULL,
    "failures" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMPTZ(6),
    "first_failure_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),

    CONSTRAINT "login_attempts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "login_attempts_scope_idx" ON "login_attempts"("scope");
CREATE INDEX "login_attempts_updated_idx" ON "login_attempts"("updated_at");

-- Only this service touches the table; no client ever reads it, and there is
-- no row a signed-in user should be able to see. RLS on with no policy denies
-- every anon/authenticated request while the service role bypasses it.
ALTER TABLE "login_attempts" ENABLE ROW LEVEL SECURITY;
