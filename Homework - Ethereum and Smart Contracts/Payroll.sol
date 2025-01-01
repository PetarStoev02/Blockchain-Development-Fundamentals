// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract PayrollCalculator {
    // Custom errors for validation
    error InvalidSalary();
    error InvalidRating();

    function calculatePaycheck(uint256 salary, uint256 rating) public pure returns (uint256 totalPaycheck) {
        // Validate input values
        if (salary <= 0) revert InvalidSalary();
        if (rating > 10) revert InvalidRating();

        // Calculate the total paycheck
        totalPaycheck = salary;

        // Add bonus if the rating qualifies
        if (rating > 8) {
            uint256 bonus = (salary * 10) / 100; // 10% bonus
            totalPaycheck += bonus;
        }

        return totalPaycheck;
    }
}
