// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./StakeX.sol";

contract StakingPool {
    StakeX public immutable stakingToken;
    
    struct Staker {
        uint256 stakedAmount;
        uint256 lastUpdateTime;
        uint256 unclaimedRewards;
    }
    
    mapping(address => Staker) public stakers;
    
    // Annual reward rate (5% = 500 basis points)
    uint256 constant REWARD_RATE = 500;
    uint256 constant BASIS_POINTS = 10000;
    
    event Staked(address indexed user, uint256 amount);
    event Unstaked(address indexed user, uint256 amount);
    event RewardsClaimed(address indexed user, uint256 amount);
    
    constructor(address _stakingToken) {
        stakingToken = StakeX(_stakingToken);
    }
    
    function stake(uint256 amount) external {
        require(amount > 0, "Cannot stake 0");
        
        Staker storage staker = stakers[msg.sender];
        if (staker.stakedAmount > 0) {
            // Update rewards for existing stake
            updateRewards(msg.sender);
        }
        
        staker.stakedAmount += amount;
        // Set initial lastUpdateTime when first staking
        if (staker.lastUpdateTime == 0) {
            staker.lastUpdateTime = block.timestamp;
        }
        require(stakingToken.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        emit Staked(msg.sender, amount);
    }
    
    function unstake(uint256 amount) external {
        Staker storage staker = stakers[msg.sender];
        require(amount > 0, "Cannot unstake 0");
        require(staker.stakedAmount >= amount, "Insufficient staked amount");
        
        updateRewards(msg.sender);
        
        staker.stakedAmount -= amount;
        require(stakingToken.transfer(msg.sender, amount), "Transfer failed");
        emit Unstaked(msg.sender, amount);
    }
    
    function claimRewards() external {
        updateRewards(msg.sender);
        Staker storage staker = stakers[msg.sender];
        
        uint256 rewards = staker.unclaimedRewards;
        require(rewards > 0, "No rewards to claim");
        
        staker.unclaimedRewards = 0;
        stakingToken.mint(msg.sender, rewards);
        emit RewardsClaimed(msg.sender, rewards);
    }
    
    function updateRewards(address _staker) internal {
        Staker storage staker = stakers[_staker];
        if (staker.stakedAmount > 0 && staker.lastUpdateTime > 0) {
            uint256 timeElapsed = block.timestamp - staker.lastUpdateTime;
            if (timeElapsed > 0) {
                uint256 rewards = (staker.stakedAmount * REWARD_RATE * timeElapsed) / (BASIS_POINTS * 365 days);
                staker.unclaimedRewards += rewards;
            }
        }
        staker.lastUpdateTime = block.timestamp;
    }
    
    function getStakerInfo(address _staker) external view returns (
        uint256 stakedAmount,
        uint256 unclaimedRewards
    ) {
        Staker memory staker = stakers[_staker];
        uint256 currentRewards = staker.unclaimedRewards;
        
        if (staker.stakedAmount > 0 && staker.lastUpdateTime > 0) {
            uint256 timeElapsed = block.timestamp - staker.lastUpdateTime;
            if (timeElapsed > 0) {
                currentRewards += (staker.stakedAmount * REWARD_RATE * timeElapsed) / (BASIS_POINTS * 365 days);
            }
        }
        
        return (staker.stakedAmount, currentRewards);
    }
}