// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

contract Memo {
    struct Message {
        string text;
        address author;
        uint40 timestamp;
    }

    uint256 public constant MAX_MESSAGE_LENGTH = 280;
    uint256 public constant MAX_PAGE_SIZE = 50;

    Message[] private messages;

    function postMessage(string calldata text) external {
        uint256 length = bytes(text).length;
        require(length > 0, "Empty message");
        require(length <= MAX_MESSAGE_LENGTH, "Message too long");

        messages.push(
            Message({text: text, author: msg.sender, timestamp: uint40(block.timestamp)})
        );
    }

    function messageCount() external view returns (uint256) {
        return messages.length;
    }

    function getMessage(uint256 index) external view returns (string memory, address, uint40) {
        require(index < messages.length, "Index out of bounds");
        Message memory msgItem = messages[index];
        return (msgItem.text, msgItem.author, msgItem.timestamp);
    }

    function getMessages(
        uint256 offset,
        uint256 limit
    ) external view returns (string[] memory, address[] memory, uint40[] memory) {
        uint256 total = messages.length;
        if (offset >= total) {
            return (new string[](0), new address[](0), new uint40[](0));
        }
        require(limit > 0, "Limit is zero");
        require(limit <= MAX_PAGE_SIZE, "Limit too large");

        uint256 end = offset + limit;
        if (end > total) {
            end = total;
        }

        uint256 size = end - offset;
        string[] memory texts = new string[](size);
        address[] memory authors = new address[](size);
        uint40[] memory timestamps = new uint40[](size);

        for (uint256 i = 0; i < size; i++) {
            Message memory msgItem = messages[offset + i];
            texts[i] = msgItem.text;
            authors[i] = msgItem.author;
            timestamps[i] = msgItem.timestamp;
        }

        return (texts, authors, timestamps);
    }
}
