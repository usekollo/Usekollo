-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "full_name" TEXT NOT NULL DEFAULT '',
    "avatar_url" TEXT,
    "stellar_public_key" TEXT,
    "wallet_connected_at" TIMESTAMPTZ(6),
    "wallet_last_synced_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_challenges" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "public_key" TEXT NOT NULL,
    "nonce" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "consumed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wallet_challenges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "goal_id" BIGINT,
    "goal_name" TEXT,
    "owner" TEXT NOT NULL,
    "user_id" UUID,
    "type" TEXT NOT NULL,
    "amount" DECIMAL(20,7),
    "asset_code" TEXT,
    "status" TEXT NOT NULL,
    "tx_hash" TEXT NOT NULL,
    "ledger_sequence" BIGINT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "indexer_checkpoint" (
    "contract_id" TEXT NOT NULL,
    "last_ledger" BIGINT NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "indexer_checkpoint_pkey" PRIMARY KEY ("contract_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_stellar_public_key_idx" ON "users"("stellar_public_key");

-- CreateIndex
CREATE INDEX "wallet_challenges_user_idx" ON "wallet_challenges"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "wallet_challenges_nonce_idx" ON "wallet_challenges"("nonce");

-- CreateIndex
CREATE INDEX "activity_owner_created_idx" ON "activity"("owner", "created_at");

-- CreateIndex
CREATE INDEX "activity_goal_created_idx" ON "activity"("goal_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "activity_tx_hash_type_idx" ON "activity"("tx_hash", "type");

-- AddForeignKey
ALTER TABLE "wallet_challenges" ADD CONSTRAINT "wallet_challenges_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity" ADD CONSTRAINT "activity_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
