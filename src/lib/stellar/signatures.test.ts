// The gate that decides whether a transaction is really from the wallet it
// claims to be from. If this is wrong, the non-custodial guarantee is wrong,
// so it gets tested against real keypairs rather than mocks.

import { describe, expect, it } from "vitest";
import { Account, Keypair, Networks, Operation, TransactionBuilder } from "@stellar/stellar-sdk";
import { assertSignedBySource } from "./signatures";

const PASSPHRASE = Networks.TESTNET;

function build(source: Keypair, networkPassphrase = PASSPHRASE) {
  return new TransactionBuilder(new Account(source.publicKey(), "0"), {
    fee: "100",
    networkPassphrase,
  })
    .addOperation(Operation.bumpSequence({ bumpTo: "0" }))
    .setTimeout(30)
    .build();
}

describe("assertSignedBySource", () => {
  it("accepts a transaction signed by its own source", () => {
    const keypair = Keypair.random();
    const tx = build(keypair);
    tx.sign(keypair);

    expect(() => assertSignedBySource(tx)).not.toThrow();
  });

  it("rejects an unsigned transaction", () => {
    expect(() => assertSignedBySource(build(Keypair.random()))).toThrow(/unsigned/i);
  });

  it("rejects a transaction signed by a different account", () => {
    const source = Keypair.random();
    const other = Keypair.random();
    const tx = build(source);
    tx.sign(other);

    expect(() => assertSignedBySource(tx)).toThrow(/different account/i);
  });

  it("rejects a signature made against another network", () => {
    // The hint matches, because the right key signed — but the payload it
    // signed was hashed with a different passphrase, so verification fails.
    // This is the case that is otherwise indistinguishable from a bad key.
    const keypair = Keypair.random();
    const wrongNetwork = build(keypair, Networks.PUBLIC);
    wrongNetwork.sign(keypair);

    const tx = build(keypair);
    tx.signatures.push(...wrongNetwork.signatures);

    expect(() => assertSignedBySource(tx)).toThrow(/different network/i);
  });

  it("accepts extra signatures from other keys", () => {
    // Multisig is legitimate; the network judges those itself. What matters
    // here is only that the source's own signature is present and good.
    const source = Keypair.random();
    const cosigner = Keypair.random();
    const tx = build(source);
    tx.sign(source);
    tx.sign(cosigner);

    expect(() => assertSignedBySource(tx)).not.toThrow();
  });
});
