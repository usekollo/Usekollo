// Smoke test for the Prisma runtime client: proves the generated client, the
// driver adapter and the transaction-pooler connection all work together.
//
//   pnpm smoke:prisma
import { prisma } from "@/lib/db/client";

async function main() {
  const [users, challenges, activity, checkpoints] = await Promise.all([
    prisma.user.count(),
    prisma.walletChallenge.count(),
    prisma.activity.count(),
    prisma.indexerCheckpoint.count(),
  ]);

  console.log("prisma client: ok");
  console.log("  users:              ", users);
  console.log("  wallet_challenges:  ", challenges);
  console.log("  activity:           ", activity);
  console.log("  indexer_checkpoint: ", checkpoints);

  // A write, rolled back, so the smoke test proves more than read access
  // without leaving a row behind.
  await prisma
    .$transaction(async (tx) => {
      await tx.indexerCheckpoint.create({
        data: { contractId: "__smoke_test__", lastLedger: 1n },
      });
      throw new Error("rollback");
    })
    .catch((error: unknown) => {
      if (error instanceof Error && error.message === "rollback") return;
      throw error;
    });

  const leftover = await prisma.indexerCheckpoint.count({
    where: { contractId: "__smoke_test__" },
  });
  console.log("write + rollback:    ", leftover === 0 ? "ok" : "LEFT A ROW");
}

main()
  .catch((error) => {
    console.error("prisma client: FAILED");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
