// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {Newsstand} from "../src/Newsstand.sol";

/**
 * Deploys the newsstand and configures it fully in one broadcast.
 *
 * Deploying and then leaving the contract half-configured is how a paper ends up
 * charging the wrong price, so everything the paper needs to sell an issue is set
 * here: the ETH/USD feed, the one-cent cover price, USDC as a second currency,
 * and a burn budget with real headroom but a hard ceiling.
 *
 *   forge script script/DeployNewsstand.s.sol:DeployNewsstand \
 *     --rpc-url https://mainnet.base.org --account mj41deployer --broadcast
 */
contract DeployNewsstand is Script {
    // Base mainnet
    address constant RWACU        = 0x184f5AAcdbb3e482ce6E5E4a7075500E589A5E68;
    address constant WETH         = 0x4200000000000000000000000000000000000006;
    address constant USDC         = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;
    address constant ROUTER       = 0x2626664c2603336E57B271c5C0b26F421741e481;
    address constant ETH_USD_FEED = 0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70;

    /// Where the money goes. mj41's primary wallet.
    address constant TREASURY = 0x758AF4a670adE40C2FfE1B6C4746340910a44B96;

    uint24 constant RWACU_WETH_FEE = 10000; // 1%
    uint24 constant USDC_WETH_FEE  = 500;   // 0.05%

    /// One cent.
    uint256 constant PRICE_CENTS = 1;

    /// $0.01 in USDC's six decimals.
    uint256 constant USDC_PRICE = 10_000;

    /**
     * Fallback price, used only in the moments before the feed is wired and if
     * the oracle is ever cleared. Roughly a cent at ETH $2,400.
     */
    uint256 constant FALLBACK_PRICE_WEI = 4_152_980_581_541;

    /**
     * Most a single burn may spend. The burn costs about 5.06e9 wei today, so
     * this leaves ~100x headroom for $RWACu appreciating or the pool thinning,
     * while still capping what a manipulated pool could take from one sale.
     */
    uint256 constant MAX_SWAP_WEI = 500_000_000_000;

    /// Same idea in USDC units: half a cent.
    uint256 constant MAX_SWAP_USDC = 5_000;

    function run() external {
        vm.startBroadcast();

        Newsstand stand = new Newsstand(
            RWACU, WETH, ROUTER, TREASURY, FALLBACK_PRICE_WEI, RWACU_WETH_FEE
        );

        // Price in money, not wei — converted live on every purchase.
        stand.setEthUsdFeed(ETH_USD_FEED);
        stand.setPriceUsdCents(PRICE_CENTS);
        stand.setMaxSwapWei(MAX_SWAP_WEI);

        // Second door: USDC, routed USDC → WETH → $RWACu.
        stand.acceptToken(
            USDC,
            USDC_PRICE,
            MAX_SWAP_USDC,
            abi.encodePacked(RWACU, RWACU_WETH_FEE, WETH, USDC_WETH_FEE, USDC)
        );

        vm.stopBroadcast();

        console.log("");
        console.log("Newsstand deployed  :", address(stand));
        console.log("treasury            :", stand.treasury());
        console.log("owner               :", stand.owner());
        console.log("cover price (cents) :", stand.priceUsdCents());
        console.log("cover price (wei)   :", stand.priceWei());
        console.log("burn per sale       :", stand.burnAmount());
        console.log("accepted tokens     :", stand.acceptedTokens().length);
        console.log("");
        console.log("Put this in Vercel as NEXT_PUBLIC_NEWSSTAND_ADDRESS.");
    }
}
