// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {TwasToken} from "../src/TwasToken.sol";

contract TwasTokenScript is Script {
    function setUp() public {}

    function run() public {
        vm.startBroadcast();

        TwasToken nft = new TwasToken("TwasToken", "TWAS");
        console.log("TwasToken deployed to:", address(nft));

        vm.stopBroadcast();
    }
}