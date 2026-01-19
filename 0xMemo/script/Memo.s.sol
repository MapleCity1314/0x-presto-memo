// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script} from "forge-std/Script.sol";
import {Memo} from "../src/Memo.sol";

contract MemoScript is Script {
    Memo public memo;

    function setUp() public {}

    function run() public {
        vm.startBroadcast();

        memo = new Memo();

        vm.stopBroadcast();
    }
}
