#!/usr/bin/env bash
#
# Build, deploy and initialize the savings-goal contract on Stellar Testnet,
# then print the env vars the app needs. Safe to re-run: deploying again just
# produces a new contract id, and initialize on an already-initialized
# contract fails harmlessly with AlreadyInitialized.
#
#   ./contract/scripts/deploy.sh [identity-name]
#
# Requires the `stellar` CLI (v23+) on PATH.

set -euo pipefail

IDENTITY="${1:-kollo-admin}"
PASSPHRASE="Test SDF Network ; September 2015"

# Passing --rpc-url/--network-passphrase explicitly rather than `--network
# testnet`. The named-network path resolves its host differently and fails
# with a DNS error on some Windows setups even when the URL itself is
# reachable; the explicit form works everywhere.
RPC_URL="https://soroban-testnet.stellar.org"
NET=(--rpc-url "$RPC_URL" --network-passphrase "$PASSPHRASE")

here="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$here"

say() { printf '\n\033[1m==> %s\033[0m\n' "$1"; }

say "Testing $IDENTITY"
if ! stellar keys address "$IDENTITY" >/dev/null 2>&1; then
  echo "Identity '$IDENTITY' not found — generating it."
  stellar keys generate "$IDENTITY" >/dev/null
fi
ADMIN="$(stellar keys address "$IDENTITY")"
echo "admin: $ADMIN"

# `stellar keys generate --fund` shells out to friendbot through the same path
# that fails above, so fund over plain HTTP instead. Already-funded accounts
# get a harmless 400 back, which is why the failure is not fatal here.
say "Funding via friendbot"
curl -sS -m 90 "https://friendbot.stellar.org/?addr=$ADMIN" -o /dev/null -w 'friendbot: %{http_code}\n' || true

say "Building"
stellar contract build
WASM="target/wasm32v1-none/release/savings_goal.wasm"
ls -l "$WASM"

say "Running tests"
cargo test --quiet

say "Deploying"
CONTRACT_ID="$(stellar contract deploy --wasm "$WASM" --source "$IDENTITY" "${NET[@]}" 2>/dev/null | tail -1)"
echo "contract: $CONTRACT_ID"

say "Resolving asset contract addresses"
# Deterministic per (asset, network) — these are the Stellar Asset Contract
# wrappers the goal contract transfers through, not the classic asset codes.
XLM_SAC="$(stellar contract id asset --asset native "${NET[@]}" | tail -1)"
USDC_ISSUER="GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5"
USDC_SAC="$(stellar contract id asset --asset "USDC:$USDC_ISSUER" "${NET[@]}" | tail -1)"
echo "XLM  SAC: $XLM_SAC"
echo "USDC SAC: $USDC_SAC"

say "Initializing allowlist"
stellar contract invoke --id "$CONTRACT_ID" --source "$IDENTITY" "${NET[@]}" \
  -- initialize --admin "$ADMIN" \
  --allowed_assets "[\"$XLM_SAC\",\"$USDC_SAC\"]"

say "Verifying"
stellar contract invoke --id "$CONTRACT_ID" --source "$IDENTITY" "${NET[@]}" --send=no \
  -- get_allowed_assets

cat <<ENVEOF

==> Copy into .env

CONTRACT_ID=$CONTRACT_ID
NEXT_PUBLIC_CONTRACT_ID=$CONTRACT_ID
ASSET_XLM_CONTRACT_ID=$XLM_SAC
ASSET_USDC_CONTRACT_ID=$USDC_SAC
ASSET_USDC_ISSUER=$USDC_ISSUER

Explorer: https://stellar.expert/explorer/testnet/contract/$CONTRACT_ID
ENVEOF
