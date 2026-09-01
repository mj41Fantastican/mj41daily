# Newsstand

The contract that sells The Daily Miscellany and burns $RWACu doing it.

## The problem it solves

41 $RWACu is the paper's signature number. It is also worth about **$0.000012** —
the token trades near $0.00000030, so 41 of them cost less than the gas to move
them. Pricing the paper in $RWACu would make it free. Pricing it in dollars would
throw away the number.

`Newsstand` separates the two. The reader pays a real price in ETH or an accepted
token, set by the editor. The contract buys **exactly** 41 $RWACu with a sliver of
that payment, destroys it, and forwards the rest to the treasury. Every sale burns
the same 41 tokens regardless of what was paid, and the burn is permanent and
provable on-chain.

## Why exact-output swaps

An exact-*input* swap of a few thousand wei rounds to nothing in a pool this thin.
Asking the router for exactly 41 tokens out, and letting it decide the input, is
the only way to guarantee the burn is always precisely 41 — never 40.9, never zero.

Measured on a live Base fork:

| | |
|---|---|
| Cover price | 100,000,000,000,000 wei (0.0001 ETH) |
| Cost of the burn | **5,060,254,666 wei** |
| To treasury | 99,994,939,745,334 wei |
| Share consumed by the burn | 0.005% |

## Routes

$RWACu has no deep pool, so the route matters:

| Venue | Pair | Liquidity | Used for |
|---|---|---|---|
| Uniswap v3, 1% | RWACu / WETH | ~$3.0k | the ETH door |
| Uniswap v3, multi-hop | RWACu ← WETH ← USDC | — | the USDC door |
| Aerodrome | RWACu / USDC | ~$13.4k | not used — different router |

Each accepted token stores its own encoded swap path, so the editor can add any
token with a Uniswap v3 route to $RWACu without redeploying.

## Editor controls

Everything the dashboard needs to drive, owner-only:

- `setPriceWei` — the cover price in ETH. Zero closes the ETH door.
- `setBurnAmount` — how much $RWACu dies per sale. Defaults to `41e18`.
- `acceptToken(token, price, maxSwapIn, swapPath)` / `removeToken`
- `setTreasury`, `setOwner`, `setEthPoolFee`, `setMaxSwapWei`

`maxSwapWei` caps what a single burn may spend, so a manipulated pool cannot eat a
reader's payment. `setMaxSwapWei` refuses any value above the cover price.

## Readership from chain data

Every sale emits `Purchased(reader, issueId, paidIn, amountPaid, rwacuBurned, spentOnBurn)`.
Sales and cumulative burn can be counted from logs alone, without trusting the
database — which matters, given the last version of this paper reported four
successful NFT mints that had never touched the chain.

## Running the tests

The suite forks live Base on purpose. A mocked pool would prove nothing: the whole
question is whether a burn this small survives real, thin liquidity.

```bash
cd contracts
forge install foundry-rs/forge-std   # lib/ is gitignored
export BASE_RPC_URL=https://mainnet.base.org
forge test -vv
```

14 tests, covering: exactly-41 burns on both doors, the treasury remainder, no
stranded ETH/WETH/RWACu, the purchase event, five consecutive sales, underpayment,
unaccepted tokens, every editor control, and access control.

## Deploying

Not yet deployed. Needs a deployer wallet with a little ETH on Base.

```bash
forge create src/Newsstand.sol:Newsstand \
  --rpc-url $BASE_RPC_URL --private-key $DEPLOYER_KEY \
  --constructor-args \
    0x184f5AAcdbb3e482ce6E5E4a7075500E589A5E68 \
    0x4200000000000000000000000000000000000006 \
    0x2626664c2603336E57B271c5C0b26F421741e481 \
    <TREASURY> <PRICE_WEI> 10000
```
