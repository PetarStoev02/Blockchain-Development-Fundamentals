// SPDX-License-Identifier: MIT

pragma solidity 0.8.28;


error UnderagedCandidate();

contract VotingEligibilityChecker {

    function checkEligibility(uint104 age) pure external returns (bool isVaildAge) {
        if(age >= 18){
            isVaildAge=true;
        } else {
            revert UnderagedCandidate();
        }
    }
}