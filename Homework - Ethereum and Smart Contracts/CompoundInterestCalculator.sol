// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract CompoundInterestCalculator {
    event CalculatedInterest(uint256 finalAmount);

    function calculateCompoundInterest(
        uint256 principal,
        uint256 rate,
        uint256 year
    ) public returns (uint256 finalAmount) {
        require(principal > 0, "Principal must be greater than zero.");
        require(rate > 0, "Rate must be greater than zero.");
        require(year > 0, "Years must be greater than zero.");

        uint256 balance = principal;

        for (uint256 i = 0; i < year; i++) {
            // Calculate interest for the year and add it to the balance
            uint256 interest = (balance * rate) / 100;
            balance += interest;
        }

        // Emit the result
        emit CalculatedInterest(balance);

        return balance;
    }
}
