// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console, Vm} from "forge-std/Test.sol";
import {Newsstand, IERC20, IAggregatorV3} from "../src/Newsstand.sol";

/**
 * Fork tests against live Base.
 *
 * These run against the real $RWACu token, the real 1% Uniswap v3 pool and the
 * real router. A mocked pool would prove nothing here: the entire question is
 * whether a burn this small survives contact with thin liquidity, and only real
 * state can answer that.
 */
contract NewsstandTest is Test {
    address constant RWACU  = 0x184f5AAcdbb3e482ce6E5E4a7075500E589A5E68;
    address constant WETH   = 0x4200000000000000000000000000000000000006;
    address constant USDC   = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;
    address constant ROUTER = 0x2626664c2603336E57B271c5C0b26F421741e481;

    uint24 constant RWACU_WETH_FEE = 10000; // 1%
    uint24 constant USDC_WETH_FEE  = 500;   // 0.05%
    address constant ETH_USD_FEED = 0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70;

    address treasury = address(0xBEEF);
    address reader   = address(0xCAFE);
    address editor   = address(this);

    Newsstand stand;

    function setUp() public {
        vm.createSelectFork(vm.envString("BASE_RPC_URL"));
        stand = new Newsstand(
            RWACU, WETH, ROUTER, treasury,
            0.0001 ether,     // cover price
            RWACU_WETH_FEE
        );
        vm.deal(reader, 1 ether);
    }

    // ─── The core promise ────────────────────────────────────────────────────

    function test_BuyWithETH_burnsExactly41() public {
        uint256 supplyBefore = _totalSupply();

        vm.prank(reader);
        stand.buyWithETH{value: 0.0001 ether}(1);

        assertEq(
            supplyBefore - _totalSupply(),
            41e18,
            "supply must fall by exactly 41 RWACu"
        );
    }

    function test_BuyWithETH_treasuryGetsTheRest() public {
        uint256 price = 0.0001 ether;
        // Measure the delta: on a real fork this address may already hold ETH.
        uint256 before = treasury.balance;

        vm.prank(reader);
        stand.buyWithETH{value: price}(1);

        uint256 received = treasury.balance - before;
        assertGt(received, 0, "treasury must be paid");
        // The burn costs about 5e9 wei; the treasury should keep essentially all
        // of a 1e14 wei cover price.
        assertGt(received, (price * 99) / 100, "burn must not eat the payment");
        assertLe(received, price, "treasury cannot receive more than was paid");
        console.log("cover price wei :", price);
        console.log("to treasury wei :", received);
        console.log("burn cost wei   :", price - received);
    }

    function test_BuyWithETH_leavesNothingBehind() public {
        vm.prank(reader);
        stand.buyWithETH{value: 0.0001 ether}(1);

        assertEq(address(stand).balance, 0, "no ETH may be stranded");
        assertEq(IERC20(RWACU).balanceOf(address(stand)), 0, "no RWACu may be stranded");
        assertEq(IERC20(WETH).balanceOf(address(stand)), 0, "no WETH may be stranded");
    }

    function test_BuyWithETH_emitsTheReadershipRecord() public {
        vm.recordLogs();
        vm.prank(reader);
        stand.buyWithETH{value: 0.0001 ether}(7);

        Vm.Log[] memory logs = vm.getRecordedLogs();
        bool found;
        for (uint256 i = 0; i < logs.length; i++) {
            if (logs[i].topics[0] == keccak256(
                "Purchased(address,uint256,address,uint256,uint256,uint256)"
            )) {
                assertEq(uint256(logs[i].topics[2]), 7, "issueId must be recorded");
                found = true;
            }
        }
        assertTrue(found, "a purchase must be provable from chain data");
    }

    function test_RepeatedBuys_eachBurn41() public {
        uint256 supplyBefore = _totalSupply();
        for (uint256 i = 0; i < 5; i++) {
            vm.prank(reader);
            stand.buyWithETH{value: 0.0001 ether}(i);
        }
        assertEq(supplyBefore - _totalSupply(), 5 * 41e18, "five sales, five burns");
    }

    // ─── Paying with USDC ────────────────────────────────────────────────────

    function test_BuyWithUSDC_burnsExactly41() public {
        bytes memory path = abi.encodePacked(
            RWACU, RWACU_WETH_FEE, WETH, USDC_WETH_FEE, USDC
        );
        stand.acceptToken(USDC, 410_000, 100_000, path); // $0.41, ≤$0.10 on the burn

        deal(USDC, reader, 1_000_000);
        vm.startPrank(reader);
        IERC20(USDC).approve(address(stand), type(uint256).max);

        uint256 supplyBefore = _totalSupply();
        stand.buyWithToken(USDC, 1);
        vm.stopPrank();

        assertEq(supplyBefore - _totalSupply(), 41e18, "USDC sale must burn 41 too");
        assertGt(IERC20(USDC).balanceOf(treasury), 0, "treasury must receive USDC");
        assertEq(IERC20(USDC).balanceOf(address(stand)), 0, "no USDC stranded");
    }

    function test_UnacceptedToken_reverts() public {
        vm.expectRevert(abi.encodeWithSelector(Newsstand.TokenNotAccepted.selector, USDC));
        vm.prank(reader);
        stand.buyWithToken(USDC, 1);
    }

    // ─── Editor controls ─────────────────────────────────────────────────────

    function test_Underpaying_reverts() public {
        vm.expectRevert(
            abi.encodeWithSelector(Newsstand.Underpaid.selector, 1, 0.0001 ether)
        );
        vm.prank(reader);
        stand.buyWithETH{value: 1}(1);
    }

    function test_EditorCanChangePrice() public {
        stand.setFixedPriceWei(0.0002 ether);
        assertEq(stand.priceWei(), 0.0002 ether);

        vm.prank(reader);
        stand.buyWithETH{value: 0.0002 ether}(1);
        assertGt(treasury.balance, 0);
    }

    function test_EditorCanChangeBurnAmount() public {
        stand.setBurnAmount(100e18);
        uint256 supplyBefore = _totalSupply();

        vm.prank(reader);
        stand.buyWithETH{value: 0.0001 ether}(1);

        assertEq(supplyBefore - _totalSupply(), 100e18, "burn amount must be settable");
    }

    function test_StrangerCannotChangeAnything() public {
        vm.expectRevert(Newsstand.NotOwner.selector);
        vm.prank(reader);
        stand.setFixedPriceWei(0);

        vm.expectRevert(Newsstand.NotOwner.selector);
        vm.prank(reader);
        stand.setTreasury(reader);
    }

    function test_PriceOfZeroClosesTheEthDoor() public {
        stand.setFixedPriceWei(0);
        vm.expectRevert(Newsstand.EthDoorClosed.selector);
        vm.prank(reader);
        stand.buyWithETH{value: 1 ether}(1);
    }

    function test_AcceptAndRemoveToken() public {
        bytes memory path = abi.encodePacked(
            RWACU, RWACU_WETH_FEE, WETH, USDC_WETH_FEE, USDC
        );
        stand.acceptToken(USDC, 410_000, 100_000, path);
        assertEq(stand.acceptedTokens().length, 1);

        stand.removeToken(USDC);
        assertEq(stand.acceptedTokens().length, 0);

        vm.expectRevert(abi.encodeWithSelector(Newsstand.TokenNotAccepted.selector, USDC));
        vm.prank(reader);
        stand.buyWithToken(USDC, 1);
    }

    function test_BurnBudgetCannotExceedPrice() public {
        vm.expectRevert(Newsstand.BurnBudgetTooHigh.selector);
        stand.setMaxSwapWei(1 ether);
    }

    // ─── Dollar pricing ──────────────────────────────────────────────────────

    function test_PriceInCents_tracksTheLiveEthRate() public {
        stand.setEthUsdFeed(ETH_USD_FEED);
        stand.setPriceUsdCents(1); // one cent

        uint256 wei_ = stand.priceWei();
        (, int256 answer, , , ) = IAggregatorV3(ETH_USD_FEED).latestRoundData();
        assertEq(wei_, (1 * 1e24) / uint256(answer), "cent price must convert at the live rate");

        // Sanity: a cent of ETH should land in a believable range.
        assertGt(wei_, 1e11, "a cent cannot be that little ETH");
        assertLt(wei_, 1e14, "a cent cannot be that much ETH");
        console.log("ETH/USD (8dp)  :", uint256(answer));
        console.log("$0.01 in wei   :", wei_);
    }

    function test_BuyAtOneCent_burns41() public {
        stand.setEthUsdFeed(ETH_USD_FEED);
        stand.setPriceUsdCents(1);

        uint256 price = stand.priceWei();
        uint256 supplyBefore = _totalSupply();
        uint256 before = treasury.balance;

        vm.prank(reader);
        stand.buyWithETH{value: price}(1);

        assertEq(supplyBefore - _totalSupply(), 41e18, "a one-cent sale still burns 41");
        uint256 received = treasury.balance - before;
        console.log("cover price wei:", price);
        console.log("to treasury    :", received);
        console.log("burn cost      :", price - received);
        assertGt(received, (price * 90) / 100, "the burn must not eat a one-cent sale");
    }

    function test_StaleOracle_stopsSales() public {
        stand.setEthUsdFeed(ETH_USD_FEED);
        stand.setPriceUsdCents(1);
        stand.setMaxPriceAge(1); // anything older than a second is stale

        vm.warp(block.timestamp + 2 days);
        vm.expectRevert();
        stand.priceWei();
    }

    function test_NoFeed_fallsBackToFixedWei() public {
        assertEq(stand.ethUsdFeed(), address(0));
        assertEq(stand.priceWei(), 0.0001 ether, "must use the fixed price with no feed");
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    /// @dev $RWACu has no mint, so total supply only ever falls. That is what
    ///      makes the burn meaningful and what these tests measure.
    function _totalSupply() private view returns (uint256) {
        (bool ok, bytes memory data) =
            RWACU.staticcall(abi.encodeWithSignature("totalSupply()"));
        require(ok, "totalSupply failed");
        return abi.decode(data, (uint256));
    }
}
