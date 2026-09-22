-- Store the challenge transaction we issued, so verification compares against
-- the exact bytes the wallet was given rather than rebuilding them.
ALTER TABLE "wallet_challenges" ADD COLUMN "challenge_xdr" TEXT;
