const {
    time,
    loadFixture,
  } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
  const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
  const { expect } = require("chai");

  describe.only("NFTMarketplace", function() {

    let roles;
    const MARKETPLACE_INITIAL_FEE = 250;
    const LISTING_PRICE = 200;
    const LISTING_DURATION = 3600;
    const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
    const LISTING_IS_AUCTION_TRUE = true;

    async function initializeRoles() {
        if(!roles) {
            const [nftMarketplaceDeployer, nftOwner, nftBuyer, secondNftBuyer] = await ethers.getSigners();
            roles = {nftMarketplaceDeployer, nftOwner, nftBuyer, secondNftBuyer};
        }

        return roles;
    }

    async function deployNFTMarketplaceFixture() {
        const {nftMarketplaceDeployer} = await initializeRoles();

        const nftMarketPlaceFactory = await  ethers.getContractFactory("NFTMarketplace");
        const NFTMarketplace = await nftMarketPlaceFactory.connect(nftMarketplaceDeployer).deploy();

        return {nftMarketplaceDeployer, NFTMarketplace}
    }

    async function deployAndMintNFT() {
        const {nftOwner} = await initializeRoles();

        const nftFactory = await ethers.getContractFactory("MyToken");
        const nft = await nftFactory.connect(nftOwner).deploy("MyToken", "MT");

        await nft.connect(nftOwner).mint(nftOwner.address);
        const tokenId =   Number(await nft._tokenIdCounter()) -1;
        

        return {nftOwner, nft, tokenId}
    }


    describe("Deployment",  function () {
        
        it("Should check if owner is set correctly when deploying contract", async function() {
            const {nftMarketplaceDeployer, NFTMarketplace} = await loadFixture(deployNFTMarketplaceFixture);
            expect(await NFTMarketplace.owner()).to.be.equal(nftMarketplaceDeployer.address);
        });

        it("Should check if counter is set to 0 upon contract deploy", async function() {
            const {NFTMarketplace} = await loadFixture(deployNFTMarketplaceFixture);
            expect(await NFTMarketplace.listingCounter()).to.be.equal(0);
        });
        
        it("Should check if initial is set correctly upon contract deploy", async function() {
            const {NFTMarketplace} = await loadFixture(deployNFTMarketplaceFixture);
            expect(await NFTMarketplace.marketplaceFee()).to.be.equal(MARKETPLACE_INITIAL_FEE);
        });

        it("Should check if initial is set correctly upon contract deploy", async function() {
            const {NFTMarketplace} = await loadFixture(deployNFTMarketplaceFixture);
            expect(await NFTMarketplace.marketplaceFee()).to.be.equal(MARKETPLACE_INITIAL_FEE);
        });

    })

    describe("CreateListings", function() {
       
        it("Should check if listing creation reverts when price is 0", async function() {
            const {NFTMarketplace} = await loadFixture(deployNFTMarketplaceFixture);
            const { nft, tokenId} = await loadFixture(deployAndMintNFT);

            await expect(NFTMarketplace.createListing( nft.target, tokenId, 0, LISTING_IS_AUCTION_TRUE, LISTING_DURATION))
                .to.revertedWithCustomError(NFTMarketplace, "PriceTooLow");
        }); 

        it("Should check if listing creation reverts when duration is 0", async function() {
            const {NFTMarketplace} = await loadFixture(deployNFTMarketplaceFixture);
            const { nft, tokenId} = await loadFixture(deployAndMintNFT);

            await expect(NFTMarketplace.createListing( nft.target, tokenId, LISTING_PRICE, LISTING_IS_AUCTION_TRUE, 0))
                .to.revertedWithCustomError(NFTMarketplace, "DurationInvalid");
        }); 

        it("Should check if listing creation reverts when caller is not nft owner", async function() {
            const { NFTMarketplace} = await loadFixture(deployNFTMarketplaceFixture);
            const { nft, tokenId} = await loadFixture(deployAndMintNFT);
        
            await expect(NFTMarketplace.createListing( nft.target, tokenId, LISTING_PRICE, LISTING_IS_AUCTION_TRUE, LISTING_DURATION))
                .to.revertedWithCustomError(NFTMarketplace, "NotNFTOwner");
        }); 
        
        it("Should check if listing creation reverts when caller is not nft owner", async function() {
            const { NFTMarketplace} = await loadFixture(deployNFTMarketplaceFixture);
            const { nftOwner, nft, tokenId} = await loadFixture(deployAndMintNFT);
        
            await expect(NFTMarketplace.connect(nftOwner).createListing( nft.target, tokenId, LISTING_PRICE, LISTING_IS_AUCTION_TRUE, LISTING_DURATION))
                .to.revertedWithCustomError(NFTMarketplace, "MarketplaceNotApproved");
        }); 

        it("Should check if listing successfully added upon creation", async function() {
            const { NFTMarketplace} = await loadFixture(deployNFTMarketplaceFixture);
            const { nftOwner, nft, tokenId} = await loadFixture(deployAndMintNFT);

            await nft.connect(nftOwner).setApprovalForAll(NFTMarketplace.target, true);
            await NFTMarketplace.connect(nftOwner).createListing( nft.target, tokenId, LISTING_PRICE, LISTING_IS_AUCTION_TRUE, LISTING_DURATION);

            expect(await NFTMarketplace.listingCounter())
                    .to.be.equal(1);
        });

        it("Should check if listing parameters are set correctly", async function() {
            const { NFTMarketplace} = await loadFixture(deployNFTMarketplaceFixture);
            const { nftOwner, nft, tokenId} = await loadFixture(deployAndMintNFT);

            const timeOfCreation = await time.latest();
            await nft.connect(nftOwner).setApprovalForAll(NFTMarketplace.target, true);
            await NFTMarketplace.connect(nftOwner).createListing( nft.target, tokenId, LISTING_PRICE, LISTING_IS_AUCTION_TRUE, LISTING_DURATION);

            const listing = await NFTMarketplace.listings(0);
            expect(listing.seller).to.equal(nftOwner.address);
            expect(listing.tokenId).to.equal(tokenId);
            expect(listing.price).to.equal(LISTING_PRICE);
            expect(listing.nftContract).to.equal(nft.target);
            expect(listing.deadline).to.above(timeOfCreation + LISTING_DURATION);
            expect(listing.highestBidder).to.equal(ZERO_ADDRESS);
            expect(listing.highestBid).to.equal(0);
            expect(listing.active).to.equal(true);
        });

        it("Should check if event is emitted upon listing creation", async function() {
            const { NFTMarketplace} = await loadFixture(deployNFTMarketplaceFixture);
            const { nftOwner, nft, tokenId} = await loadFixture(deployAndMintNFT);

            await nft.connect(nftOwner).setApprovalForAll(NFTMarketplace.target, true);
            await expect(NFTMarketplace
                .connect(nftOwner)
                .createListing( nft.target, tokenId, LISTING_PRICE, LISTING_IS_AUCTION_TRUE, LISTING_DURATION))
                .to.emit(NFTMarketplace, "ListingCreated");

        });
    })

    describe("Place Bid", function() {
        it("Should check if transaction reverts if non existant listing", async function () {
            const { NFTMarketplace} = await loadFixture(deployNFTMarketplaceFixture);
            await expect(NFTMarketplace.placeBid(1))
                .to.revertedWithCustomError(NFTMarketplace, "InvalidListing");
        });

        it("Should check if transaction reverts if listing is not active", async function() {
            const { NFTMarketplace} = await loadFixture(deployNFTMarketplaceFixture);
            const { nftOwner, nft, tokenId} = await loadFixture(deployAndMintNFT);

            await nft.connect(nftOwner).setApprovalForAll(NFTMarketplace.target, true);
            await NFTMarketplace.connect(nftOwner).createListing( nft.target, tokenId, LISTING_PRICE, LISTING_IS_AUCTION_TRUE, LISTING_DURATION);
            await NFTMarketplace.connect(nftOwner).cancelListing(0);

            await expect(NFTMarketplace.placeBid(0))
                .to.revertedWithCustomError(NFTMarketplace, "ListingNotActive");
        });

        it("Should revert if listing is not an auction", async function() {
            const { NFTMarketplace} = await loadFixture(deployNFTMarketplaceFixture);
            const { nftOwner, nft, tokenId} = await loadFixture(deployAndMintNFT);

            await nft.connect(nftOwner).setApprovalForAll(NFTMarketplace.target, true);
            await NFTMarketplace.connect(nftOwner).createListing( nft.target, tokenId, LISTING_PRICE, !LISTING_IS_AUCTION_TRUE, LISTING_DURATION);

            await expect(NFTMarketplace.placeBid(0))
                .to.revertedWithCustomError(NFTMarketplace, "NotAnAuction");
        });

        it("Should revert if listing deadline ended", async function() {
            const { NFTMarketplace} = await loadFixture(deployNFTMarketplaceFixture);
            const { nftOwner, nft, tokenId} = await loadFixture(deployAndMintNFT);

            await nft.connect(nftOwner).setApprovalForAll(NFTMarketplace.target, true);
            await NFTMarketplace.connect(nftOwner).createListing( nft.target, tokenId, LISTING_PRICE, LISTING_IS_AUCTION_TRUE, LISTING_DURATION);

            await time.increaseTo(await time.latest() + LISTING_DURATION + 5);
            await expect(NFTMarketplace.placeBid(0))
                .to.revertedWithCustomError(NFTMarketplace, "AuctionEnded");
        });

        it("Should revert if listing seller wants to bid", async function() {
            const { NFTMarketplace} = await loadFixture(deployNFTMarketplaceFixture);
            const { nftOwner, nft, tokenId} = await loadFixture(deployAndMintNFT);

            await nft.connect(nftOwner).setApprovalForAll(NFTMarketplace.target, true);
            await NFTMarketplace.connect(nftOwner).createListing( nft.target, tokenId, LISTING_PRICE, LISTING_IS_AUCTION_TRUE, LISTING_DURATION);

            await expect(NFTMarketplace.connect(nftOwner).placeBid(0))
                .to.revertedWithCustomError(NFTMarketplace, "SellerCannotBid");
        });

        it("Should revert if bid is lower than price", async function() {
            const { NFTMarketplace} = await loadFixture(deployNFTMarketplaceFixture);
            const { nftOwner, nft, tokenId} = await loadFixture(deployAndMintNFT);

            await nft.connect(nftOwner).setApprovalForAll(NFTMarketplace.target, true);
            await NFTMarketplace.connect(nftOwner).createListing( nft.target, tokenId, LISTING_PRICE, LISTING_IS_AUCTION_TRUE, LISTING_DURATION);

            await expect(NFTMarketplace.placeBid(0, { value: ethers.parseEther("0.0") }))
                .to.revertedWithCustomError(NFTMarketplace, "BidTooLow");
        });

        it("Should successfully emit event when bid is successfully palced", async function() {
            const { NFTMarketplace} = await loadFixture(deployNFTMarketplaceFixture);
            const { nftOwner, nft, tokenId} = await loadFixture(deployAndMintNFT);
            const {nftBuyer} = await initializeRoles();

            await nft.connect(nftOwner).setApprovalForAll(NFTMarketplace.target, true);
            await NFTMarketplace.connect(nftOwner).createListing( nft.target, tokenId, LISTING_PRICE, LISTING_IS_AUCTION_TRUE, LISTING_DURATION);
            await expect(NFTMarketplace.connect(nftBuyer).placeBid(0, { value: ethers.parseEther("1") }))
                .to.emit(NFTMarketplace, "BidPlaced");
        
        });


        it("Should successfully update the bid history when bid is successfully created", async function() {
            const { NFTMarketplace} = await loadFixture(deployNFTMarketplaceFixture);
            const { nftOwner, nft, tokenId} = await loadFixture(deployAndMintNFT);
            const {nftBuyer} = await initializeRoles();

            await nft.connect(nftOwner).setApprovalForAll(NFTMarketplace.target, true);
            await NFTMarketplace.connect(nftOwner).createListing( nft.target, tokenId, LISTING_PRICE, LISTING_IS_AUCTION_TRUE, LISTING_DURATION);
            await NFTMarketplace.connect(nftBuyer).placeBid(0, { value: ethers.parseEther("1") });

            const bid = await NFTMarketplace.bidsHistory(0, 0);

            expect(await bid.bidder).to.be.equal(nftBuyer.address);
            expect(await bid.amount).to.be.equal(ethers.parseEther("1"));
        
        });

        it("Should successfully update the listing's highest bid and bidder", async function() {
            const { NFTMarketplace} = await loadFixture(deployNFTMarketplaceFixture);
            const { nftOwner, nft, tokenId} = await loadFixture(deployAndMintNFT);
            const {nftBuyer, secondNftBuyer} = await initializeRoles();

            await nft.connect(nftOwner).setApprovalForAll(NFTMarketplace.target, true);
            await NFTMarketplace.connect(nftOwner).createListing( nft.target, tokenId, LISTING_PRICE, LISTING_IS_AUCTION_TRUE, LISTING_DURATION);
            await NFTMarketplace.connect(nftBuyer).placeBid(0, { value: ethers.parseEther("1") });

            const listing = await NFTMarketplace.listings(0);

            expect(await listing.highestBidder).to.be.equal(nftBuyer.address);
            expect(await listing.highestBid).to.be.equal(ethers.parseEther("1"));

            await NFTMarketplace.connect(secondNftBuyer).placeBid(0, { value: ethers.parseEther("2") });

            const listingUpdated = await NFTMarketplace.listings(0);

            expect(await listingUpdated.highestBidder).to.be.equal(secondNftBuyer.address);
            expect(await listingUpdated.highestBid).to.be.equal(ethers.parseEther("2"));
        
        });

        it("Should successfully update pendig returns mapping", async function() {
            const { NFTMarketplace} = await loadFixture(deployNFTMarketplaceFixture);
            const { nftOwner, nft, tokenId} = await loadFixture(deployAndMintNFT);
            const {nftBuyer, secondNftBuyer} = await initializeRoles();

            await nft.connect(nftOwner).setApprovalForAll(NFTMarketplace.target, true);
            await NFTMarketplace.connect(nftOwner).createListing( nft.target, tokenId, LISTING_PRICE, LISTING_IS_AUCTION_TRUE, LISTING_DURATION);
            await NFTMarketplace.connect(nftBuyer).placeBid(0, { value: ethers.parseEther("1") });

            await NFTMarketplace.connect(secondNftBuyer).placeBid(0, { value: ethers.parseEther("2") });

            await NFTMarketplace.pendingReturns(nftBuyer.address);

            expect(await NFTMarketplace.pendingReturns(nftBuyer.address)).to.be.equal(ethers.parseEther("1") );
        
        });
    });

    describe("BuyingMechanism", function() {
        it("Should check if transaction reverts if non existant listing", async function () {
            const { NFTMarketplace} = await loadFixture(deployNFTMarketplaceFixture);
            await expect(NFTMarketplace.buyNow(1))
                .to.revertedWithCustomError(NFTMarketplace, "InvalidListing");
        });

        it("Should check if transaction reverts if listing is not active", async function() {
            const { NFTMarketplace} = await loadFixture(deployNFTMarketplaceFixture);
            const { nftOwner, nft, tokenId} = await loadFixture(deployAndMintNFT);

            await nft.connect(nftOwner).setApprovalForAll(NFTMarketplace.target, true);
            await NFTMarketplace.connect(nftOwner).createListing( nft.target, tokenId, LISTING_PRICE, LISTING_IS_AUCTION_TRUE, LISTING_DURATION);
            await NFTMarketplace.connect(nftOwner).cancelListing(0);

            await expect(NFTMarketplace.buyNow(0))
                .to.revertedWithCustomError(NFTMarketplace, "ListingNotActive");
        });

        it("Should revert if bid is lower than price", async function() {
            const { NFTMarketplace} = await loadFixture(deployNFTMarketplaceFixture);
            const { nftOwner, nft, tokenId} = await loadFixture(deployAndMintNFT);

            await nft.connect(nftOwner).setApprovalForAll(NFTMarketplace.target, true);
            await NFTMarketplace.connect(nftOwner).createListing( nft.target, tokenId, LISTING_PRICE, !LISTING_IS_AUCTION_TRUE, LISTING_DURATION);

            await expect(NFTMarketplace.buyNow(0, { value: ethers.parseEther("0.0") }))
                .to.revertedWithCustomError(NFTMarketplace, "InsufficientPayment");
        });

        it("Should revert if listing seller wants to buy", async function() {
            const { NFTMarketplace} = await loadFixture(deployNFTMarketplaceFixture);
            const { nftOwner, nft, tokenId} = await loadFixture(deployAndMintNFT);

            await nft.connect(nftOwner).setApprovalForAll(NFTMarketplace.target, true);
            await NFTMarketplace.connect(nftOwner).createListing( nft.target, tokenId, LISTING_PRICE, !LISTING_IS_AUCTION_TRUE, LISTING_DURATION);

            await expect(NFTMarketplace.connect(nftOwner).buyNow(0, { value: ethers.parseEther("1.0") }))
                .to.revertedWithCustomError(NFTMarketplace, "SellerCannotBuy");
        });

        it("Should check if event is emitted when buying completed successfully", async function() {
            const { NFTMarketplace} = await loadFixture(deployNFTMarketplaceFixture);
            const { nftOwner, nft, tokenId} = await loadFixture(deployAndMintNFT);
            const {nftBuyer} = await initializeRoles();

            await nft.connect(nftOwner).setApprovalForAll(NFTMarketplace.target, true);
            await NFTMarketplace.connect(nftOwner).createListing( nft.target, tokenId, LISTING_PRICE, !LISTING_IS_AUCTION_TRUE, LISTING_DURATION);

            await expect(NFTMarketplace.connect(nftBuyer).buyNow(0, { value: ethers.parseEther("1.0") }))
                .to.emit(NFTMarketplace, "ListingSold");
        });

        it("Should check if token ballance is successfully updated when buying completed", async function() {
            const { NFTMarketplace} = await loadFixture(deployNFTMarketplaceFixture);
            const { nftOwner, nft, tokenId} = await loadFixture(deployAndMintNFT);
            const {nftBuyer} = await initializeRoles();

            await nft.connect(nftOwner).setApprovalForAll(NFTMarketplace.target, true);
            await NFTMarketplace.connect(nftOwner).createListing( nft.target, tokenId, LISTING_PRICE, !LISTING_IS_AUCTION_TRUE, LISTING_DURATION);

            await expect(NFTMarketplace.connect(nftBuyer).buyNow(0, { value: ethers.parseEther("1.0") }))
                .to.changeTokenBalance(nft, nftBuyer, 1);
        });

        it("Should check if balances are successfully updated", async function() {
            const { nftMarketplaceDeployer,NFTMarketplace} = await loadFixture(deployNFTMarketplaceFixture);
            const { nftOwner, nft, tokenId} = await loadFixture(deployAndMintNFT);
            const {nftBuyer} = await initializeRoles();

            await nft.connect(nftOwner).setApprovalForAll(NFTMarketplace.target, true);
            await NFTMarketplace.connect(nftOwner).createListing( nft.target, tokenId, LISTING_PRICE, !LISTING_IS_AUCTION_TRUE, LISTING_DURATION);

            const amount =  Number(ethers.parseEther("0.0005"));
            const  fee = (amount * MARKETPLACE_INITIAL_FEE) / 10000;
            const sellerAmount = amount - fee;
            await expect(NFTMarketplace.connect(nftBuyer).buyNow(0, { value: amount }))
                .to.changeEtherBalances([nftOwner, nftMarketplaceDeployer], [sellerAmount, fee]);
        });

    });

    describe("Auction Mechanism", function () {
        it("Should check if auction finalization reverts if auction has not ended", async function () {
            const { NFTMarketplace} = await loadFixture(deployNFTMarketplaceFixture);
            const { nftOwner, nft, tokenId} = await loadFixture(deployAndMintNFT);
            const {nftBuyer} = await initializeRoles();

            await nft.connect(nftOwner).setApprovalForAll(NFTMarketplace.target, true);
            await NFTMarketplace.connect(nftOwner).createListing( nft.target, tokenId, LISTING_PRICE, LISTING_IS_AUCTION_TRUE, LISTING_DURATION);
            
            await expect(NFTMarketplace.connect(nftBuyer).finalizeAuction(0))
                .to.revertedWithCustomError(NFTMarketplace, "AuctionNotEnded");
        });

        it("Should check if auction finalization emits event when no bids are placed", async function () {
            const { NFTMarketplace} = await loadFixture(deployNFTMarketplaceFixture);
            const { nftOwner, nft, tokenId} = await loadFixture(deployAndMintNFT);
            const {nftBuyer} = await initializeRoles();

            await nft.connect(nftOwner).setApprovalForAll(NFTMarketplace.target, true);
            await NFTMarketplace.connect(nftOwner).createListing( nft.target, tokenId, LISTING_PRICE, LISTING_IS_AUCTION_TRUE, LISTING_DURATION);
            
            await time.increaseTo(await time.latest() + LISTING_DURATION + 5);
            await expect(NFTMarketplace.connect(nftBuyer).finalizeAuction(0))
                .to.emit(NFTMarketplace, "ListingCanceled");
        });


        it("Should check if auction finalization emits sold event when there are bids placed", async function () {
            const { NFTMarketplace} = await loadFixture(deployNFTMarketplaceFixture);
            const { nftOwner, nft, tokenId} = await loadFixture(deployAndMintNFT);
            const {nftBuyer} = await initializeRoles();

            await nft.connect(nftOwner).setApprovalForAll(NFTMarketplace.target, true);
            await NFTMarketplace.connect(nftOwner).createListing( nft.target, tokenId, LISTING_PRICE, LISTING_IS_AUCTION_TRUE, LISTING_DURATION);
            await NFTMarketplace.connect(nftBuyer).placeBid(0, { value: ethers.parseEther("1") });

            await time.increaseTo(await time.latest() + LISTING_DURATION + 5);

            await expect(NFTMarketplace.connect(nftBuyer).finalizeAuction(0))
                .to.emit(NFTMarketplace, "ListingSold");
        });
    })


    describe("Listing cancelation", function () {
        it("Should check if cancel listing reverts if not called by owner of nft", async function () {
            const { NFTMarketplace} = await loadFixture(deployNFTMarketplaceFixture);
            const { nftOwner, nft, tokenId} = await loadFixture(deployAndMintNFT);
            const {nftBuyer} = await initializeRoles();

            await nft.connect(nftOwner).setApprovalForAll(NFTMarketplace.target, true);
            await NFTMarketplace.connect(nftOwner).createListing( nft.target, tokenId, LISTING_PRICE, LISTING_IS_AUCTION_TRUE, LISTING_DURATION);
            
            await expect(NFTMarketplace.connect(nftBuyer).cancelListing(0))
                .to.revertedWithCustomError(NFTMarketplace, "NotAuthorized");
        });

        it("Should check if cancel listing reverts if there are bids placed", async function () {
            const { NFTMarketplace} = await loadFixture(deployNFTMarketplaceFixture);
            const { nftOwner, nft, tokenId} = await loadFixture(deployAndMintNFT);
            const {nftBuyer} = await initializeRoles();

            await nft.connect(nftOwner).setApprovalForAll(NFTMarketplace.target, true);
            await NFTMarketplace.connect(nftOwner).createListing( nft.target, tokenId, LISTING_PRICE, LISTING_IS_AUCTION_TRUE, LISTING_DURATION);
            await NFTMarketplace.connect(nftBuyer).placeBid(0, { value: ethers.parseEther("1") });

            await expect(NFTMarketplace.connect(nftOwner).cancelListing(0))
                .to.revertedWithCustomError(NFTMarketplace, "CannotCancelAuctionWithBids");
        });

        it("Should check if cancel listing emits event when completed successfully", async function () {
            const { NFTMarketplace} = await loadFixture(deployNFTMarketplaceFixture);
            const { nftOwner, nft, tokenId} = await loadFixture(deployAndMintNFT);

            await nft.connect(nftOwner).setApprovalForAll(NFTMarketplace.target, true);
            await NFTMarketplace.connect(nftOwner).createListing( nft.target, tokenId, LISTING_PRICE, LISTING_IS_AUCTION_TRUE, LISTING_DURATION);

            await expect(NFTMarketplace.connect(nftOwner).cancelListing(0))
                .to.emit(NFTMarketplace, "ListingCanceled");
        });
    })

    describe("Pending returns", function () {
        it("Should check if pending reterns reverts if there are no reterns for given address", async function() {
            const { NFTMarketplace} = await loadFixture(deployNFTMarketplaceFixture);
            const { nftOwner, nft, tokenId} = await loadFixture(deployAndMintNFT);
            const {nftBuyer} = await initializeRoles();

            await nft.connect(nftOwner).setApprovalForAll(NFTMarketplace.target, true);
            await NFTMarketplace.connect(nftOwner).createListing( nft.target, tokenId, LISTING_PRICE, LISTING_IS_AUCTION_TRUE, LISTING_DURATION);


            await expect(NFTMarketplace.connect(nftBuyer).withdrawPendingReturns())
                .to.revertedWithCustomError(NFTMarketplace, "NoPendingReturns");
        });

        it("Should check if balance is successfully updated when pending returns is being called", async function() {
            const { NFTMarketplace} = await loadFixture(deployNFTMarketplaceFixture);
            const { nftOwner, nft, tokenId} = await loadFixture(deployAndMintNFT);
            const {nftBuyer, secondNftBuyer} = await initializeRoles();

            await nft.connect(nftOwner).setApprovalForAll(NFTMarketplace.target, true);
            await NFTMarketplace.connect(nftOwner).createListing( nft.target, tokenId, LISTING_PRICE, LISTING_IS_AUCTION_TRUE, LISTING_DURATION);
            await NFTMarketplace.connect(nftBuyer).placeBid(0, { value: ethers.parseEther("1") });

            await NFTMarketplace.connect(secondNftBuyer).placeBid(0, { value: ethers.parseEther("2") });

            const returnAmount = ethers.parseEther("1");
            await expect(NFTMarketplace.connect(nftBuyer).withdrawPendingReturns())
                .to.changeEtherBalances([nftBuyer], [returnAmount]);

        });
    });

    describe("Change Fee", function () {
        it("Should check if transaction reverts if called by non owner", async function () {
            const { NFTMarketplace} = await loadFixture(deployNFTMarketplaceFixture);
            const {nftOwner} = await initializeRoles();

            await expect(NFTMarketplace.connect(nftOwner).updateMarketplaceFee(200))
                .to.revertedWithCustomError(NFTMarketplace, "NotOwner");
        });

        it("Should check if transaction reverts if new fe is too high", async function () {
            const { NFTMarketplace} = await loadFixture(deployNFTMarketplaceFixture);

            await expect(NFTMarketplace.updateMarketplaceFee(10000))
                .to.revertedWithCustomError(NFTMarketplace, "FeeTooHigh");
        });


        it("Should check if event is emitted when fee is uccessfully updated", async function () {
            const { NFTMarketplace} = await loadFixture(deployNFTMarketplaceFixture);

            await expect(NFTMarketplace.updateMarketplaceFee(MARKETPLACE_INITIAL_FEE + 10))
                .to.emit(NFTMarketplace, "MarketplaceFeeUpdated");
        });
    });

  })