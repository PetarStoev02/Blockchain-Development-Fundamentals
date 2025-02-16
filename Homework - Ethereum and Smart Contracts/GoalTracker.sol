// SPDX-License-Identifier: MIT

pragma solidity ^0.8.28;


error GoalAlreadyClaimed();
error GoalNotMet();
error InvalidAmount();

contract GoalTracker {

    uint256 public goalAmount;
    uint256 public baseReward;
    uint256 public spending;
    uint256 public reward;
    bool public rewardClaimed;

    constructor(uint256 _goalAmount, uint256 _baseReward) {
        require(_goalAmount > 0, "Goal amount must be greater than zero.");
        require(_baseReward > 0, "Base reward must be greater than zero.");

        goalAmount = _goalAmount;
        baseReward = _baseReward;
        rewardClaimed = false;
    }

    function addSpending(uint256 amount) external {
        if (amount <= 0) revert InvalidAmount();
        spending += amount;
    }

    function claimReward() external {
        if (rewardClaimed) revert GoalAlreadyClaimed();
        if (spending < goalAmount) revert GoalNotMet();

        for (uint256 i = 0; i < 5; i++) {
            reward += baseReward;
        }

        rewardClaimed = true; 
    }

}