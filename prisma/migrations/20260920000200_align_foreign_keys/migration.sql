-- The tables were originally created by the hand-written supabase/setup.sql,
-- which declared both foreign keys with an ON DELETE rule but left ON UPDATE
-- at the default NO ACTION. Prisma generates ON UPDATE CASCADE, so without
-- this the schema and the database disagree and every future `migrate diff`
-- reports drift.
--
-- The ON DELETE behaviour is unchanged: cascade for wallet_challenges,
-- set null for activity.

-- DropForeignKey
ALTER TABLE "activity" DROP CONSTRAINT "activity_user_id_fkey";

-- DropForeignKey
ALTER TABLE "wallet_challenges" DROP CONSTRAINT "wallet_challenges_user_id_fkey";

-- AddForeignKey
ALTER TABLE "wallet_challenges" ADD CONSTRAINT "wallet_challenges_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity" ADD CONSTRAINT "activity_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
