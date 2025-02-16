// SPDX-License-Identifier: MIT

pragma solidity 0.8.28;

struct Card {
    uint256 id;
    string name;
}

library ArrayLib {
    function exists(Card[] memory cards, uint256 id) internal pure returns (bool) {

        uint256 cardsLength = cards.length; 
        assert(cardsLength < 1000);

        for(uint256 i=0; i<cardsLength; i++) {
            if(cards[i].id == id) {
                return true;
            }
        }

        return false;
    }
}

contract CollectibleCardLibrary {
    using  ArrayLib for Card[];

    mapping(address => Card[]) public collections;

     function addCard(uint256 id,  string calldata name) external {
        if (collections[msg.sender].exists(id)) {
            revert ("Card already in deck");
        }

        collections[msg.sender].push(Card({id: id, name: name}));
    }
}