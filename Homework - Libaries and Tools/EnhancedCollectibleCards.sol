// SPDX-License-Identifier: MIT

pragma solidity 0.8.28;

contract EnhancedCollectibleCards {
    address public owner;

    struct Card {
        uint256 id;
        string name;
    }

    Card[] private cards;

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Owner role required!");
        _;
    }

    function removeAt(uint256 index) external onlyOwner{
        uint256 lastIndex = cards.length -1;

        if(cards.length -1 < index) {
            revert ("Card does not exist on index specified");
        }

        cards[index] = cards[lastIndex];
        cards.pop();
    }

    function addCard(uint256 id, string calldata name) external onlyOwner {
        cards.push(Card(id, name));
    }

}