import { expect } from "chai";
import { ethers } from "hardhat";
import { StakeX, StakingPool } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("StakingPool", function () {
  let stakeX: StakeX;
  let stakingPool: StakingPool;
  let owner: SignerWithAddress;
  let user: SignerWithAddress;
  
  const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE"));
  const INITIAL_STAKE = ethers.parseUnits("1000", 8);

  beforeEach(async function () {
    [owner, user] = await ethers.getSigners();
    
    // Deploy StakeX
    const StakeX = await ethers.getContractFactory("StakeX");
    stakeX = await StakeX.deploy();
    
    // Deploy StakingPool
    const StakingPool = await ethers.getContractFactory("StakingPool");
    stakingPool = await StakingPool.deploy(await stakeX.getAddress());
    
    // Grant minter role to staking pool
    await stakeX.grantRole(MINTER_ROLE, await stakingPool.getAddress());
    
    // Transfer some tokens to user for testing
    await stakeX.transfer(user.address, INITIAL_STAKE);
    // Approve staking pool to spend user's tokens
    await stakeX.connect(user).approve(await stakingPool.getAddress(), INITIAL_STAKE);
  });

  describe("Deployment", function () {
    it("Should set the correct staking token", async function () {
      expect(await stakingPool.stakingToken()).to.equal(await stakeX.getAddress());
    });
  });

  describe("Staking", function () {
    it("Should allow users to stake tokens", async function () {
      await stakingPool.connect(user).stake(INITIAL_STAKE);
      const stakerInfo = await stakingPool.stakers(user.address);
      expect(stakerInfo.stakedAmount).to.equal(INITIAL_STAKE);
    });

    it("Should fail when staking 0 tokens", async function () {
      await expect(
        stakingPool.connect(user).stake(0)
      ).to.be.revertedWith("Cannot stake 0");
    });

    it("Should fail when staking more than balance", async function () {
      const tooMuch = INITIAL_STAKE + ethers.parseUnits("1", 8);
      await expect(
        stakingPool.connect(user).stake(tooMuch)
      ).to.be.revertedWithCustomError(stakeX, "ERC20InsufficientAllowance");
    });
  });

  describe("Unstaking", function () {
    beforeEach(async function () {
      await stakingPool.connect(user).stake(INITIAL_STAKE);
    });

    it("Should allow users to unstake tokens", async function () {
      await stakingPool.connect(user).unstake(INITIAL_STAKE);
      const stakerInfo = await stakingPool.stakers(user.address);
      expect(stakerInfo.stakedAmount).to.equal(0);
    });

    it("Should fail when unstaking 0 tokens", async function () {
      await expect(
        stakingPool.connect(user).unstake(0)
      ).to.be.revertedWith("Cannot unstake 0");
    });

    it("Should fail when unstaking more than staked", async function () {
      const tooMuch = INITIAL_STAKE + ethers.parseUnits("1", 8);
      await expect(
        stakingPool.connect(user).unstake(tooMuch)
      ).to.be.revertedWith("Insufficient staked amount");
    });

    it("Should update user balance after unstaking", async function () {
      const balanceBefore = await stakeX.balanceOf(user.address);
      await stakingPool.connect(user).unstake(INITIAL_STAKE);
      const balanceAfter = await stakeX.balanceOf(user.address);
      expect(balanceAfter).to.equal(balanceBefore + INITIAL_STAKE);
    });

    it("Should update staked amount after partial unstake", async function () {
      const partialAmount = INITIAL_STAKE / BigInt(2);
      await stakingPool.connect(user).unstake(partialAmount);
      const stakerInfo = await stakingPool.stakers(user.address);
      expect(stakerInfo.stakedAmount).to.equal(partialAmount);
    });

    it("Should keep accumulated rewards after partial unstake", async function () {
      await time.increase(180 * 24 * 60 * 60); // 180 days
      const partialAmount = INITIAL_STAKE / BigInt(2);
      await stakingPool.connect(user).unstake(partialAmount);
      const stakerInfo = await stakingPool.getStakerInfo(user.address);
      expect(stakerInfo.unclaimedRewards).to.be.gt(0);
    });
  });

  describe("Rewards", function () {
    beforeEach(async function () {
      await stakingPool.connect(user).stake(INITIAL_STAKE);
    });

    it("Should accumulate rewards over time", async function () {
      // Move time forward by 365 days
      await time.increase(365 * 24 * 60 * 60);
      
      const stakerInfo = await stakingPool.getStakerInfo(user.address);
      // Expected reward is 5% of staked amount after 1 year
      const expectedReward = INITIAL_STAKE * BigInt(500) / BigInt(10000);
      expect(stakerInfo.unclaimedRewards).to.equal(expectedReward);
    });

    it("Should allow claiming rewards", async function () {
      // Move time forward
      await time.increase(365 * 24 * 60 * 60);
      
      const balanceBefore = await stakeX.balanceOf(user.address);
      await stakingPool.connect(user).claimRewards();
      const balanceAfter = await stakeX.balanceOf(user.address);
      
      expect(balanceAfter).to.be.gt(balanceBefore);
    });

    it("Should calculate rewards correctly for partial year", async function () {
      await time.increase(180 * 24 * 60 * 60); // 180 days
      const stakerInfo = await stakingPool.getStakerInfo(user.address);
      const expectedReward = (INITIAL_STAKE * BigInt(500) * BigInt(180)) / (BigInt(10000) * BigInt(365));
      expect(stakerInfo.unclaimedRewards).to.be.closeTo(expectedReward, 1000n); // Allow small rounding difference
    });

    it("Should reset unclaimed rewards after claiming", async function () {
      await time.increase(365 * 24 * 60 * 60);
      await stakingPool.connect(user).claimRewards();
      const stakerInfo = await stakingPool.stakers(user.address);
      expect(stakerInfo.unclaimedRewards).to.equal(0);
    });

    it("Should accumulate new rewards after claiming", async function () {
      await time.increase(365 * 24 * 60 * 60);
      await stakingPool.connect(user).claimRewards();
      await time.increase(365 * 24 * 60 * 60);
      const stakerInfo = await stakingPool.getStakerInfo(user.address);
      const expectedReward = INITIAL_STAKE * BigInt(500) / BigInt(10000);
      expect(stakerInfo.unclaimedRewards).to.equal(expectedReward);
    });

    it("Should update lastUpdateTime after claiming", async function () {
      await time.increase(365 * 24 * 60 * 60);
      await stakingPool.connect(user).claimRewards();
      const stakerInfo = await stakingPool.stakers(user.address);
      const blockTimestamp = await time.latest();
      expect(stakerInfo.lastUpdateTime).to.equal(blockTimestamp);
    });

    it("Should handle multiple stakes and rewards correctly", async function () {
      // Additional stake after some time
      await time.increase(180 * 24 * 60 * 60); // 180 days
      await stakeX.transfer(user.address, INITIAL_STAKE);
      await stakeX.connect(user).approve(await stakingPool.getAddress(), INITIAL_STAKE);
      await stakingPool.connect(user).stake(INITIAL_STAKE);

      // Move forward another 180 days
      await time.increase(180 * 24 * 60 * 60);
      
      const stakerInfo = await stakingPool.getStakerInfo(user.address);
      // First stake: 360 days of rewards
      const firstStakeReward = (INITIAL_STAKE * BigInt(500) * BigInt(360)) / (BigInt(10000) * BigInt(365));
      // Second stake: 180 days of rewards
      const secondStakeReward = (INITIAL_STAKE * BigInt(500) * BigInt(180)) / (BigInt(10000) * BigInt(365));
      const expectedReward = firstStakeReward + secondStakeReward;
      
      expect(stakerInfo.unclaimedRewards).to.be.closeTo(expectedReward, 1000n);
    });
  });
}); 