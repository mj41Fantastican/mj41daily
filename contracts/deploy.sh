#!/usr/bin/env bash
#
# Deploy the newsstand to Base.
#
# Run this in a real Terminal window, not through Claude Code's "!" prefix —
# both steps prompt for input and need a terminal that can read your typing.
#
#   bash deploy.sh
#
set -euo pipefail

export PATH="$HOME/.foundry/bin:$PATH"

ACCOUNT="mj41deployer"
DEPLOYER="0x4146Fe6Da6B307E12ED7D2AB6c6a1bF5fBB4Fc41"
RPC="https://mainnet.base.org"

cd "$(dirname "$0")"

echo
echo "The Daily Miscellany — newsstand deployment"
echo "==========================================="
echo

# ── Step 1: keystore ─────────────────────────────────────────────────────────
if cast wallet list 2>/dev/null | grep -q "^${ACCOUNT}$"; then
  echo "Keystore '${ACCOUNT}' already exists — skipping import."
else
  echo "Step 1 of 2 — store your deployer key, encrypted."
  echo
  echo "  You'll be asked for the private key of ${DEPLOYER},"
  echo "  then for a password to encrypt it with."
  echo
  echo "  The key is encrypted into ~/.foundry/keystores and never appears in a"
  echo "  command, your shell history, or any chat. You only type the password"
  echo "  from here on."
  echo
  cast wallet import "$ACCOUNT" --interactive
  echo
fi

# ── Sanity: right wallet, and can it pay? ────────────────────────────────────
ADDR=$(cast wallet address --account "$ACCOUNT")
echo "Keystore address : $ADDR"

if [ "$(echo "$ADDR" | tr 'A-Z' 'a-z')" != "$(echo "$DEPLOYER" | tr 'A-Z' 'a-z')" ]; then
  echo
  echo "STOP: that key is for a different wallet than expected."
  echo "  expected $DEPLOYER"
  echo "  got      $ADDR"
  echo "Nothing has been deployed. Re-run and use the right key, or tell Claude"
  echo "if you meant to deploy from this wallet instead."
  exit 1
fi

BAL=$(cast balance --rpc-url "$RPC" "$ADDR")
echo "Balance          : $BAL wei"
if [ "$BAL" -lt 100000000000000 ]; then
  echo
  echo "STOP: under 0.0001 ETH. The deploy costs roughly 0.00003 ETH but this is"
  echo "too thin a margin. Send a little ETH to $ADDR on Base and re-run."
  exit 1
fi

# ── Step 2: deploy ───────────────────────────────────────────────────────────
echo
echo "Step 2 of 2 — deploy and configure. Costs about 0.00003 ETH (~\$0.08)."
echo "You'll be asked for the keystore password you just set."
echo
read -r -p "Deploy to Base mainnet now? [y/N] " reply
case "$reply" in
  [yY]|[yY][eE][sS]) ;;
  *) echo "Cancelled. Nothing deployed."; exit 0 ;;
esac

echo
BASE_RPC_URL="$RPC" forge script script/DeployNewsstand.s.sol:DeployNewsstand \
  --rpc-url "$RPC" \
  --account "$ACCOUNT" \
  --broadcast

echo
echo "Done. Copy the 'Newsstand deployed' address above and give it to Claude —"
echo "it goes into Vercel as NEXT_PUBLIC_NEWSSTAND_ADDRESS."
