import { expect } from "chai";
import { ethers } from "hardhat";
import { StakeX } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("StakeX", function () {
  let stakeX: StakeX;
  let owner: SignerWithAddress;
  let minter: SignerWithAddress;
  let user: SignerWithAddress;
  
  const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE"));
  const INITIAL_SUPPLY = ethers.parseUnits("5000000", 8); // 5 million tokens with 8 decimals

  beforeEach(async function () {
    [owner, minter, user] = await ethers.getSigners();
    
    const StakeX = await ethers.getContractFactory("StakeX");
    stakeX = await StakeX.deploy();
  });

  describe("Deployment", function () {
    it("Should set the right name and symbol", async function () {
      expect(await stakeX.name()).to.equal("StakeX");
      expect(await stakeX.symbol()).to.equal("STX");
    });

    it("Should set 8 decimals", async function () {
      expect(await stakeX.decimals()).to.equal(8);
    });

    it("Should mint initial supply to owner", async function () {
      expect(await stakeX.balanceOf(owner.address)).to.equal(INITIAL_SUPPLY);
    });

    it("Should set owner as admin and minter", async function () {
      expect(await stakeX.hasRole(await stakeX.DEFAULT_ADMIN_ROLE(), owner.address)).to.be.true;
      expect(await stakeX.hasRole(MINTER_ROLE, owner.address)).to.be.true;
    });
  });

  describe("Role Management", function () {
    it("Should allow admin to grant minter role", async function () {
      await stakeX.grantRole(MINTER_ROLE, minter.address);
      expect(await stakeX.hasRole(MINTER_ROLE, minter.address)).to.be.true;
    });

    it("Should allow admin to revoke minter role", async function () {
      await stakeX.grantRole(MINTER_ROLE, minter.address);
      await stakeX.revokeRole(MINTER_ROLE, minter.address);
      expect(await stakeX.hasRole(MINTER_ROLE, minter.address)).to.be.false;
    });

    it("Should not allow non-admin to grant minter role", async function () {
      await expect(
        stakeX.connect(user).grantRole(MINTER_ROLE, minter.address)
      ).to.be.revertedWithCustomError(stakeX, "AccessControlUnauthorizedAccount");
    });
  });

  describe("Minting", function () {
    beforeEach(async function () {
      await stakeX.grantRole(MINTER_ROLE, minter.address);
    });

    it("Should allow minter to mint tokens", async function () {
      const mintAmount = ethers.parseUnits("1000", 8);
      await stakeX.connect(minter).mint(user.address, mintAmount);
      expect(await stakeX.balanceOf(user.address)).to.equal(mintAmount);
    });

    it("Should not allow non-minter to mint tokens", async function () {
      const mintAmount = ethers.parseUnits("1000", 8);
      await expect(
        stakeX.connect(user).mint(user.address, mintAmount)
      ).to.be.revertedWithCustomError(stakeX, "AccessControlUnauthorizedAccount");
    });
  });

  describe("Token Transfers", function () {
    it("Should allow transfer between accounts", async function () {
      const transferAmount = ethers.parseUnits("1000", 8);
      await stakeX.transfer(user.address, transferAmount);
      expect(await stakeX.balanceOf(user.address)).to.equal(transferAmount);
    });

    it("Should fail if sender has insufficient balance", async function () {
      const transferAmount = ethers.parseUnits("6000000", 8); // More than initial supply
      await expect(
        stakeX.connect(user).transfer(owner.address, transferAmount)
      ).to.be.revertedWithCustomError(stakeX, "ERC20InsufficientBalance");
    });
  });
}); 