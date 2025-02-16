// SPDX-License-Identifier: MIT

pragma solidity ^0.8.28;

error UnsplittableSum();

contract BillSplitter {

    function splitExpense(int256 totalAmount, int256 numPeople) pure external returns (int256 personShare) {
        if(totalAmount%numPeople != 0) revert UnsplittableSum();

        personShare = totalAmount/numPeople;
    }
}