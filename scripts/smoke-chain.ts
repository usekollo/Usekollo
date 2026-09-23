// Exercises the Stellar layer against the real deployed contract on Testnet.
//
//   pnpm smoke:chain <STELLAR_PUBLIC_KEY>
//
// Covers the parts most likely to break silently: decoding contract values
// into app types, amount conversion in both directions, building a real
// transaction through simulation, and reading back what a built transaction
// actually does. It never signs or submits anything.

// Supabase is not involved in any of this, but getEnv() validates the whole
// environment at once — so stand its variables up rather than loosen the
// schema for the sake of a script.
process.env.NEXT_PUBLIC_SUPABASE_URL ||= "https://placeholder.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||= "placeholder";
process.env.SUPABASE_SERVICE_ROLE_KEY ||= "placeholder";
process.env.JWT_SECRET ||= "placeholder-placeholder-placeholder-1234";
process.env.CRON_SECRET ||= "placeholder-cron-1234";

import { fromBaseUnits, toBaseUnits } from "../src/lib/stellar/amounts";
import { assetByCode, contractId } from "../src/lib/stellar/config";
import {
  buildCreateGoal,
  buildDeposit,
  describeInvocation,
  getGoal,
  getGoals,
  parseTransaction,
} from "../src/lib/stellar/contract";
import { getWalletBalance } from "../src/lib/stellar/account";
import { readGoalEvents } from "../src/lib/stellar/events";
import { toUiGoal } from "../src/lib/domain/mappers";

const owner = process.argv[2];
if (!owner) {
  console.error("usage: pnpm smoke:chain <STELLAR_PUBLIC_KEY>");
  process.exit(1);
}

let failures = 0;

function check(label: string, condition: boolean, detail?: unknown) {
  console.log(`${condition ? "  ok  " : " FAIL "} ${label}`);
  if (detail !== undefined) console.log("        ", detail);
  if (!condition) failures += 1;
}

function section(name: string) {
  console.log(`\n== ${name} ==`);
}

async function main() {
  console.log(`contract: ${contractId()}`);
  console.log(`owner:    ${owner}`);

  section("amount conversion");
  check("100 XLM -> stroops", toBaseUnits("100", 7) === 1_000_000_000n);
  check("round trip keeps precision", fromBaseUnits(toBaseUnits("0.1234567", 7), 7) === 0.1234567);
  check(
    "over-precise amounts are rejected, not truncated",
    (() => {
      try {
        toBaseUnits("1.12345678", 7);
        return false;
      } catch {
        return true;
      }
    })(),
  );

  section("reads");
  const goals = await getGoals(owner);
  check(`get_goals returned ${goals.length} goal(s)`, goals.length > 0, goals.map((g) => g.name));

  if (goals.length > 0) {
    const first = goals[0];
    const single = await getGoal(first.id);
    check("get_goal agrees with get_goals", single?.id === first.id);

    const ui = toUiGoal(first);
    check(
      "maps onto the UI Goal shape",
      typeof ui.id === "string" &&
        typeof ui.saved === "number" &&
        /^\d{4}-\d{2}-\d{2}$/.test(ui.targetDate) &&
        ["running", "urgent", "done"].includes(ui.status),
      ui,
    );
  }

  check("missing goal reads as null, not an error", (await getGoal(999_999)) === null);

  section("wallet balance");
  const balance = await getWalletBalance(owner, "XLM");
  check("XLM balance resolved", balance.available, balance);

  section("transaction building");
  const xlm = assetByCode("XLM");
  const created = await buildCreateGoal({
    owner,
    name: "Smoke Test Goal",
    assetContractId: xlm!.contractId,
    targetAmount: toBaseUnits("25", 7),
    targetDate: Math.floor(Date.now() / 1000) + 86_400 * 60,
  });
  check("create_goal simulated and assembled", created.xdr.length > 0);

  const decoded = describeInvocation(parseTransaction(created.xdr));
  check(
    "decodes back to what was built",
    decoded.method === "create_goal" && decoded.name === "Smoke Test Goal",
    decoded,
  );

  if (goals.length > 0) {
    const deposit = await buildDeposit({ owner, goalId: goals[0].id, amount: toBaseUnits("1", 7) });
    const depositDecoded = describeInvocation(parseTransaction(deposit.xdr));
    check(
      "deposit decodes with the right goal and amount",
      depositDecoded.method === "deposit" &&
        depositDecoded.goalId === goals[0].id &&
        depositDecoded.amount === 10_000_000n,
      depositDecoded,
    );
  }

  section("events");
  // Start from 1 on purpose: this also exercises the clamp to the retention
  // window, which is what a first run or a stale checkpoint actually hits.
  const page = await readGoalEvents(1);
  check(
    `read ${page.events.length} goal event(s) up to ledger ${page.scannedTo}`,
    page.events.length > 0,
    page.events.slice(0, 3),
  );
  check("checkpoint advanced past the start", page.scannedTo > 1);

  console.log(`\n${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error("\nsmoke test threw:", error);
  process.exit(1);
});
