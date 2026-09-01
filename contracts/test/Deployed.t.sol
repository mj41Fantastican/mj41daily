// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {Newsstand, IERC20} from "../src/Newsstand.sol";

/// Smoke test against the contract that is actually deployed on Base.
contract DeployedTest is Test {
    Newsstand stand = Newsstand(payable(0xC9A024a9cd1fEE36943b2ad62135a6DBcBab36F5));
    address constant RWACU = 0x184f5AAcdbb3e482ce6E5E4a7075500E589A5E68;
    address constant USDC  = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;
    address reader = address(0xD00D);

    function setUp() public {
        vm.createSelectFork(vm.envString("BASE_RPC_URL"));
        vm.deal(reader, 1 ether);
    }

    function test_LiveContract_sellsAnIssueAndBurns41() public {
        uint256 price = stand.priceWei();
        uint256 supplyBefore = _supply();
        uint256 treasuryBefore = stand.treasury().balance;

        vm.prank(reader);
        stand.buyWithETH{value: price}(1);

        uint256 burned = supplyBefore - _supply();
        uint256 earned = stand.treasury().balance - treasuryBefore;

        console.log("cover price wei :", price);
        console.log("RWACu burned    :", burned);
        console.log("to treasury wei :", earned);
        console.log("burn cost wei   :", price - earned);

        assertEq(burned, 41e18, "the live contract must burn exactly 41");
        assertGt(earned, (price * 95) / 100, "treasury keeps the rest");
        assertEq(address(stand).balance, 0, "nothing stranded");
    }

    function test_LiveContract_sellsForUSDC() public {
        deal(USDC, reader, 1_000_000);
        uint256 supplyBefore = _supply();

        vm.startPrank(reader);
        IERC20(USDC).approve(address(stand), type(uint256).max);
        stand.buyWithToken(USDC, 1);
        vm.stopPrank();

        assertEq(supplyBefore - _supply(), 41e18, "USDC door burns 41 too");
        console.log("USDC to treasury:", IERC20(USDC).balanceOf(stand.treasury()));
    }

    function _supply() private view returns (uint256) {
        (, bytes memory d) = RWACU.staticcall(abi.encodeWithSignature("totalSupply()"));
        return abi.decode(d, (uint256));
    }
}
