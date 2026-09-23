// Reading the contract's event log. SERVER ONLY.
//
// The contract publishes typed events (see lib.rs's #[contractevent] structs)
// under the fixed topic pair ("goal", <verb>) plus the owner address. That
// shape is what lets this subscribe with one filter and switch on the verb,
// and it is why the payload arrives as a map keyed by field name rather than a
// positional tuple — adding a field to an event later cannot silently shift
// what is read here.

import { scValToNative, xdr } from "@stellar/stellar-sdk";
import { contractId, sorobanServer } from "./config";

export type GoalEventVerb = "created" | "deposit" | "withdraw" | "completed";

export interface GoalEvent {
  verb: GoalEventVerb;
  owner: string;
  goalId: number;
  /** Base units. Absent on `created` and `completed`. */
  amount: bigint | null;
  newAmount: bigint | null;
  assetContractId: string | null;
  txHash: string;
  ledger: number;
  createdAt: string;
}

export interface EventPage {
  events: GoalEvent[];
  /**
   * The ledger the scan actually reached — the checkpoint to resume from.
   *
   * Emphatically NOT the node's latest ledger: RPC caps how many ledgers it
   * will scan per request, so a single pass usually stops well short. Saving
   * the node's latest as the checkpoint would silently skip everything in
   * between.
   */
  scannedTo: number;
  cursor: string | null;
  /** True when the scan stopped on its page budget rather than catching up. */
  moreAvailable: boolean;
}

// Ledgers close about every 5 seconds, so this is ~2 minutes of slack against
// the sliding retention window — far more than a round trip needs.
const RETENTION_MARGIN_LEDGERS = 25;

// Bounded so one pass cannot run past the function's time limit. A backlog
// just takes several passes to work through; the checkpoint makes that safe.
const MAX_PAGES = 20;
const PAGE_SIZE = 200;

const VERBS: GoalEventVerb[] = ["created", "deposit", "withdraw", "completed"];

// One filter catches all four event types: topic[0] is always the literal
// symbol "goal", topic[1] is the verb and topic[2] is the owner.
const GOAL_FILTER = {
  type: "contract" as const,
  topics: [["*", "*", "*"]],
};

/**
 * Reads goal events from `startLedger` onward, following the cursor until it
 * catches up or exhausts its page budget.
 *
 * Soroban RPC only retains roughly a week of events and rejects outright any
 * `startLedger` outside that window — which is exactly what a checkpoint from
 * a long-idle deployment, or a first run starting at ledger 1, would ask for.
 * So the range is clamped to what the node actually holds. The gap that
 * implies is genuinely unrecoverable from RPC alone; those transactions were
 * recorded by the submit route at the time, and anything older than the
 * window would need a full-history source (Hubble, or an archive node).
 */
export async function readGoalEvents(startLedger: number): Promise<EventPage> {
  const server = sorobanServer();
  const filters = [{ ...GOAL_FILTER, contractIds: [contractId()] }];

  const { oldestLedger, latestLedger } = await server.getHealth();

  // The retention window slides forward as ledgers close, including in the gap
  // between the health call above and the events call below. Starting exactly
  // at `oldestLedger` therefore races: by the time the request lands, that
  // ledger has often already aged out and RPC rejects the whole call. A small
  // margin costs a few seconds of history and removes the race.
  const floor = oldestLedger + RETENTION_MARGIN_LEDGERS;
  const from = Math.min(Math.max(startLedger, floor), latestLedger);

  if (startLedger < floor) {
    console.warn(
      `[indexer] checkpoint ${startLedger} predates RPC retention (oldest ${oldestLedger}); resuming from ${from}.`,
    );
  }

  const events: GoalEvent[] = [];
  let cursor: string | null = null;
  let scannedTo = from;
  let pages = 0;

  while (pages < MAX_PAGES) {
    // Ledger-range and cursor modes are mutually exclusive: the first request
    // anchors on startLedger, every subsequent one continues from the cursor.
    const response = await server.getEvents(
      cursor
        ? { filters, cursor, limit: PAGE_SIZE }
        : { filters, startLedger: from, limit: PAGE_SIZE },
    );

    pages += 1;

    for (const raw of response.events) {
      const event = toGoalEvent(raw);
      if (event) events.push(event);
    }

    const nextCursor = response.cursor ?? null;

    // An empty page still advances the scan — it means that stretch of ledgers
    // simply held no matching events, not that we have caught up.
    scannedTo = Math.max(scannedTo, ledgerFromCursor(nextCursor) ?? lastLedgerOf(response.events) ?? scannedTo);

    // No cursor, or one that has stopped moving, means there is nothing
    // further to read right now.
    if (!nextCursor || nextCursor === cursor) break;
    cursor = nextCursor;

    if (scannedTo >= response.latestLedger) break;
  }

  return {
    events,
    scannedTo,
    cursor,
    moreAvailable: pages >= MAX_PAGES,
  };
}

/**
 * A cursor is `{toid}-{index}`, where the TOID packs the ledger sequence into
 * its top 32 bits. Decoding it is what lets an empty page still move the
 * checkpoint forward.
 */
function ledgerFromCursor(cursor: string | null): number | null {
  if (!cursor) return null;

  try {
    const toid = BigInt(cursor.split("-")[0]);
    const ledger = Number(toid >> 32n);
    return Number.isFinite(ledger) && ledger > 0 ? ledger : null;
  } catch {
    return null;
  }
}

function lastLedgerOf(events: { ledger: number }[]): number | null {
  if (events.length === 0) return null;
  return Math.max(...events.map((event) => event.ledger));
}

function toGoalEvent(raw: {
  topic: xdr.ScVal[];
  value: xdr.ScVal;
  txHash: string;
  ledger: number;
  ledgerClosedAt: string;
}): GoalEvent | null {
  try {
    const topics = raw.topic.map((t) => scValToNative(t));

    // ("goal", <verb>, <owner>)
    if (topics[0] !== "goal") return null;

    const verb = String(topics[1]) as GoalEventVerb;
    if (!VERBS.includes(verb)) return null;

    const data = scValToNative(raw.value) as Record<string, unknown>;

    return {
      verb,
      owner: String(topics[2] ?? data.owner ?? ""),
      goalId: Number(data.goal_id ?? 0),
      amount: data.amount != null ? BigInt(data.amount as string | bigint) : null,
      newAmount: data.new_amount != null ? BigInt(data.new_amount as string | bigint) : null,
      assetContractId: data.asset ? String(data.asset) : null,
      txHash: raw.txHash,
      ledger: raw.ledger,
      createdAt: raw.ledgerClosedAt,
    };
  } catch (error) {
    // One malformed event must not stop the whole pass.
    console.error("[indexer] could not decode event:", error);
    return null;
  }
}
