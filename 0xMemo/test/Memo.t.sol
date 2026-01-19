// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Test} from "forge-std/Test.sol";
import {Memo} from "../src/Memo.sol";

contract MemoTest is Test {
    Memo public memo;

    function setUp() public {
        memo = new Memo();
    }

    function test_PostMessageStoresText() public {
        memo.postMessage("hello");
        (string memory text, address author, uint40 timestamp) = memo.getMessage(0);
        assertEq(text, "hello");
        assertEq(author, address(this));
        assertGt(timestamp, 0);
        assertEq(memo.messageCount(), 1);
    }

    function test_RevertOnEmptyMessage() public {
        vm.expectRevert("Empty message");
        memo.postMessage("");
    }

    function test_RevertOnTooLongMessage() public {
        bytes memory data = new bytes(memo.MAX_MESSAGE_LENGTH() + 1);
        vm.expectRevert("Message too long");
        memo.postMessage(string(data));
    }
}
