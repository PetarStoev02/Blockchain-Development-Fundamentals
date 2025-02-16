const {
  time,
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");

describe("AuctionHouse", function () {
  async function deploymentFixture() {
    const [deployer, nftSeller, nftBuyer] = await ethers.getSigners();

    const customNFTFactory = await ethers.getContractFactory("CustomNFT");
    const customNFT = await customNFTFactory.connect(nftSeller).deploy(nftSeller.address);

    const auctionHouseFactory = await ethers.getContractFactory("AuctionHouse");
    const auctionHouse = await auctionHouseFactory.deploy(await customNFT.getAddress());

    const tokenId = customNFT.currentTokenId();
    const lowestPrice = await ethers.parseEther("1");
    const startingDelay = 1000;
    const startDate = await time.latest() +  startingDelay;
    const duration = 7*24*60*60;
    const endDate = startDate + duration;
    const smallestBidIncrement = await ethers.parseEther("0.1");
    const timeExtension = 5*60;

    return {
      deployer,
      nftSeller,
      nftBuyer,
      customNFT,
      auctionHouse,
      tokenId,
      lowestPrice,
      startingDelay,
      startDate,
      duration,
      endDate,
      smallestBidIncrement,
      timeExtension
    }
  }

  describe("List NFT for sale", function() {
    it("Should test if auction creaton fails if initial price is invalid", async function() {
      const {
        nftSeller, 
        auctionHouse,
        tokenId,
        lowestPrice,
        startDate,
        endDate,
        smallestBidIncrement,
        timeExtension} = await loadFixture(deploymentFixture);

      await expect(auctionHouse.connect(nftSeller).listNFTForSale(
        tokenId,
        0,
        startDate,
        endDate,
        smallestBidIncrement,
        timeExtension))
      .to.be.revertedWithCustomError(auctionHouse, "InvalidPrice");
    });

    it("Should test if auction creaton fails if start date is invalid", async function() {
      const {
        nftSeller, 
        auctionHouse,
        tokenId,
        lowestPrice,
        startDate,
        endDate,
        smallestBidIncrement,
        timeExtension} = await loadFixture(deploymentFixture);

      await expect(auctionHouse.connect(nftSeller).listNFTForSale(
        tokenId,
        lowestPrice,
        0,
        endDate,
        smallestBidIncrement,
        timeExtension))
      .to.be.revertedWithCustomError(auctionHouse, "InvalidStartDate");
    });

    it("Should test if auction creaton fails if end date is before start date", async function() {
      const {
        nftSeller, 
        auctionHouse,
        tokenId,
        lowestPrice,
        startDate,
        endDate,
        smallestBidIncrement,
        timeExtension} = await loadFixture(deploymentFixture);

      await expect(auctionHouse.connect(nftSeller).listNFTForSale(
        tokenId,
        lowestPrice,
        startDate,
        0,
        smallestBidIncrement,
        timeExtension))
      .to.be.revertedWithCustomError(auctionHouse, "InvalidAuctionPeriod");
    });

    it("Should test if auction creaton fails if extension provided is not valid", async function() {
      const {
        nftSeller, 
        auctionHouse,
        tokenId,
        lowestPrice,
        startDate,
        endDate,
        smallestBidIncrement,
        timeExtension} = await loadFixture(deploymentFixture);

      await expect(auctionHouse.connect(nftSeller).listNFTForSale(
        tokenId,
        lowestPrice,
        startDate,
        endDate,
        smallestBidIncrement,
        (endDate-startDate + 1)))
      .to.be.revertedWithCustomError(auctionHouse, "InvalidTimeExtension");
    });

    it("Should test if auction creaton fails if caller is not NFT owner", async function() {
      const {
        nftSeller, 
        auctionHouse,
        tokenId,
        lowestPrice,
        startDate,
        endDate,
        smallestBidIncrement,
        timeExtension} = await loadFixture(deploymentFixture);

      await expect(auctionHouse.listNFTForSale(
        tokenId,
        lowestPrice,
        startDate,
        endDate,
        smallestBidIncrement,
        timeExtension
      ))
      .to.be.revertedWithCustomError(auctionHouse, "UnauthorizedAccessToNFT");
    });

    it("Should test if auction creation reverts if auction house is not approved ", async function() {
      const {
        nftSeller, 
        auctionHouse,
        tokenId,
        lowestPrice,
        startDate,
        endDate,
        smallestBidIncrement,
        timeExtension} = await loadFixture(deploymentFixture);

      await expect(auctionHouse.connect(nftSeller).listNFTForSale(
        tokenId,
        lowestPrice,
        startDate,
        endDate,
        smallestBidIncrement,
        timeExtension
      ))
      .to.be.revertedWithCustomError(auctionHouse, "AuctionHouseNotApproved");
    });

    it("Should test if auction creation is successfull ", async function() {
      const {
        nftSeller, 
        auctionHouse,
        customNFT,
        tokenId,
        lowestPrice,
        startDate,
        endDate,
        smallestBidIncrement,
        timeExtension} = await loadFixture(deploymentFixture);

      await customNFT.connect(nftSeller).approve(await auctionHouse.getAddress(), tokenId);
      await expect(auctionHouse.connect(nftSeller).listNFTForSale(
        tokenId,
        lowestPrice,
        startDate,
        endDate,
        smallestBidIncrement,
        timeExtension
      ))
      .to.not.be.reverted;
    });

    it("Should test if auction creation  increments the auction counter", async function() {
      const {
        nftSeller, 
        auctionHouse,
        customNFT,
        tokenId,
        lowestPrice,
        startDate,
        endDate,
        smallestBidIncrement,
        timeExtension} = await loadFixture(deploymentFixture);

      await customNFT.connect(nftSeller).approve(await auctionHouse.getAddress(), tokenId);
      await auctionHouse.connect(nftSeller).listNFTForSale(
        tokenId,
        lowestPrice,
        startDate,
        endDate,
        smallestBidIncrement,
        timeExtension
      ); 

      expect(await auctionHouse.auctionsCounter()).to.be.equal(1);
    });

    it("Should test if auction creation sets the auction parameters successfully", async function() {
      const {
        nftSeller, 
        auctionHouse,
        customNFT,
        tokenId,
        lowestPrice,
        startDate,
        endDate,
        smallestBidIncrement,
        timeExtension} = await loadFixture(deploymentFixture);

      await customNFT.connect(nftSeller).approve(await auctionHouse.getAddress(), tokenId);
      await auctionHouse.connect(nftSeller).listNFTForSale(
        tokenId,
        lowestPrice,
        startDate,
        endDate,
        smallestBidIncrement,
        timeExtension
      ); 

      const auction = await auctionHouse.auctions(0);
      expect(auction.seller).to.be.equal(nftSeller.address);
      expect(auction.isFinalized).to.be.equal(false);
      expect(auction.highestBidder).to.be.equal( "0x0000000000000000000000000000000000000000");
      expect(auction.highestBid).to.be.equal(0);
    });

    it("Should test if auction creation transfers the token to auction house", async function() {
      const {
        nftSeller, 
        auctionHouse,
        customNFT,
        tokenId,
        lowestPrice,
        startDate,
        endDate,
        smallestBidIncrement,
        timeExtension} = await loadFixture(deploymentFixture);

      await customNFT.connect(nftSeller).approve(await auctionHouse.getAddress(), tokenId);
      await expect(auctionHouse.connect(nftSeller).listNFTForSale(
        tokenId,
        lowestPrice,
        startDate,
        endDate,
        smallestBidIncrement,
        timeExtension
      )).to.changeTokenBalances(customNFT, [nftSeller, await auctionHouse.getAddress()], [-1, 1]); 
    });

    it("Should test if auction creation emits event", async function() {
      const {
        nftSeller, 
        auctionHouse,
        customNFT,
        tokenId,
        lowestPrice,
        startDate,
        endDate,
        smallestBidIncrement,
        timeExtension} = await loadFixture(deploymentFixture);

      await customNFT.connect(nftSeller).approve(await auctionHouse.getAddress(), tokenId);
      await expect(auctionHouse.connect(nftSeller).listNFTForSale(
        tokenId,
        lowestPrice,
        startDate,
        endDate,
        smallestBidIncrement,
        timeExtension
      )).to.emit(auctionHouse, "NFTListed");
    });

  })

});
