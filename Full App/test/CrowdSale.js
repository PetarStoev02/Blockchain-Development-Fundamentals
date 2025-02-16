const {
    time,
    loadFixture,
  } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
  const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
  const { expect } = require("chai");
  const { ethers } = require("hardhat");

  describe("CrowdSale", function() {
    async function deployFixture() {
        const[crowdSaleOwner, tokensBuyer, feeReceiver] = await ethers.getSigners();

        const customTokenFactory = await ethers.getContractFactory("CustomToken");
        const customToken = await customTokenFactory.deploy();

        const crowdSaleFactory = await ethers.getContractFactory("CrowdSale");
        const crowdSale = await crowdSaleFactory.deploy(crowdSaleOwner);

        const crowdSaleDuration = 7 * 24 * 60 * 60;
        const startDate = await time.latest() + 1000;
        const endDate = startDate + crowdSaleDuration;
        const rate = 50;
        const tokenAmount = ethers.parseUnits("50000", 8);

        await customToken.approve(crowdSale.getAddress(), tokenAmount);

        await crowdSale.connect(crowdSaleOwner).createSale(
            startDate,
            endDate,
            rate,
            feeReceiver.address,
            tokenAmount,
            await customToken.getAddress()
        );

        return {
            crowdSale,
            customToken,
            crowdSaleOwner,
            tokensBuyer,
            crowdSaleDuration,
            startDate,
            endDate,
            rate,
            feeReceiver,
            tokenAmount
        }
    }

    describe("Buy Tokens", function() {
        it("Should check if buy tokens reverts if Sale has not yet started", async function() {
            const {crowdSale, tokensBuyer, endDate} = await loadFixture(deployFixture);

            await expect(crowdSale.connect(tokensBuyer).buyTokens(tokensBuyer))
                .to.be.revertedWithCustomError(crowdSale, "InactiveSale");
        });

        it("Should check if buy tokens reverts if deadline of sale is reached (Sale over)", async function() {
            const {crowdSale, tokensBuyer, endDate} = await loadFixture(deployFixture);

            await time.increaseTo(endDate + 1);

            await expect(crowdSale.connect(tokensBuyer).buyTokens(tokensBuyer))
                .to.be.revertedWithCustomError(crowdSale, "InactiveSale");
        });

        it("Should check if buy tokens reverts if sale is finalized", async function() {
            const {crowdSale, tokensBuyer, endDate} = await loadFixture(deployFixture);

            await time.increaseTo(endDate + 1);
            await crowdSale.finalizeSale();

            await expect(crowdSale.connect(tokensBuyer).buyTokens(tokensBuyer))
                .to.be.revertedWithCustomError(crowdSale, "InactiveSale");
        });

        it("Should check if buy tokens reverts if no ETH are send", async function() {
            const {crowdSale, tokensBuyer, startDate} = await loadFixture(deployFixture);

            await time.increaseTo(startDate + 100);

            await expect(crowdSale.connect(tokensBuyer).buyTokens(tokensBuyer))
                .to.be.revertedWithCustomError(crowdSale, "InsufficientAmountForTokenExchange");
        });

        it("Should check if buy tokens reverts if trying to buy more than tokens available", async function() {
            const {crowdSale, tokensBuyer, startDate} = await loadFixture(deployFixture);

            await time.increaseTo(startDate + 100);
            const amount =  ethers.parseEther("2000");

            await expect(crowdSale.connect(tokensBuyer).buyTokens(tokensBuyer, {value: amount}))
                .to.be.revertedWithCustomError(crowdSale, "InsufficientTokenBallance");
        });

        it("Should check if ether balance is successfully updated when tokens are bought", async function() {
            const {crowdSale, tokensBuyer, startDate} = await loadFixture(deployFixture);

            await time.increaseTo(startDate + 100);
            const amount =  ethers.parseEther("1");

            await expect(crowdSale.connect(tokensBuyer).buyTokens(tokensBuyer, {value: amount}))
                .to.changeEtherBalances([tokensBuyer, crowdSale],[-amount, amount]);
        });

        it("Should check if token balance is successfully updated when tokens are bought", async function() {
            const {crowdSale,customToken, tokensBuyer, startDate, rate} = await loadFixture(deployFixture);

            await time.increaseTo(startDate + 100);
            const amount =  ethers.parseEther("1");
            const tokensBought = ethers.parseUnits("50", 8);

            await expect(crowdSale.connect(tokensBuyer).buyTokens(tokensBuyer.address, {value: amount}))
                .to.changeTokenBalances(customToken, [tokensBuyer, crowdSale],[tokensBought, -tokensBought]);
        });

        it("Should check if event successfully emitted when tokens bought", async function() {
            const {crowdSale, tokensBuyer, startDate} = await loadFixture(deployFixture);

            await time.increaseTo(startDate + 100);
            const amount =  ethers.parseEther("1");

            await expect(crowdSale.connect(tokensBuyer).buyTokens(tokensBuyer.address, {value: amount}))
                .to.emit(crowdSale, "TokensSuccessfullyExchanged");
        });
    });

    describe("Finalize Sale", function() {
        it("Should check if function reverts when called by non owner", async function() {
            const {crowdSale, tokensBuyer} = await loadFixture(deployFixture);

            await expect(crowdSale.connect(tokensBuyer).finalizeSale())
                .to.be.revertedWithCustomError(crowdSale, "OwnableUnauthorizedAccount");
        });

        it("Should check if function reverts when sale is still active", async function() {
            const {crowdSale, startDate} = await loadFixture(deployFixture);

            await time.increaseTo(startDate + 1000);

            await expect(crowdSale.finalizeSale())
                .to.be.revertedWithCustomError(crowdSale, "SaleCannotBeFinalized");
        });

        it("Should check if sale can be finalized when all tokens are sold", async function() {
            const {crowdSale, tokensBuyer, startDate} = await loadFixture(deployFixture);

            await time.increaseTo(startDate + 1000);

            const amount = ethers.parseEther("1000");
            await crowdSale.connect(tokensBuyer).buyTokens(tokensBuyer, {value: amount});

            await expect(crowdSale.finalizeSale())
                .to.not.be.reverted;
        });

        it("Should check if flag is successfully updated when sale is finalized", async function() {
            const {crowdSale, tokensBuyer, startDate} = await loadFixture(deployFixture);

            await time.increaseTo(startDate + 1000);

            const amount = ethers.parseEther("1000");
            await crowdSale.connect(tokensBuyer).buyTokens(tokensBuyer, {value: amount});
            await crowdSale.finalizeSale()

            expect(await crowdSale.isFinalized()).to.be.equal(true);
        });

        it("Should check if event is emitted when finalization is finished", async function() {
            const {crowdSale, tokensBuyer, startDate} = await loadFixture(deployFixture);

            await time.increaseTo(startDate + 1000);

            const amount = ethers.parseEther("1000");
            await crowdSale.connect(tokensBuyer).buyTokens(tokensBuyer, {value: amount});

            await expect(crowdSale.finalizeSale())
                .to.emit(crowdSale, "SaleFinalized");
        });

        it("Should check if tokens are sent back to owner when sale is finalized", async function() {
            const {crowdSale, customToken, crowdSaleOwner, tokensBuyer, startDate, endDate, tokenAmount} 
                = await loadFixture(deployFixture);

            await time.increaseTo(startDate + 1000);

            const amount = ethers.parseEther("1");
            const tokensBought = ethers.parseUnits("50", 8);

            await crowdSale.connect(tokensBuyer).buyTokens(tokensBuyer, {value: amount});

            await time.increaseTo(endDate + 1);

            await expect(
                crowdSale.connect(crowdSaleOwner).finalizeSale()
            ).to.changeTokenBalances(
                customToken,
                [crowdSaleOwner, await crowdSale.getAddress()],
                [tokenAmount - tokensBought, tokensBought - tokenAmount ]
            );
        });


        it("Should check if ballance is sent back to fee receiver ", async function() {
            const {crowdSale, customToken, crowdSaleOwner, tokensBuyer, startDate, endDate,feeReceiver, tokenAmount} 
                = await loadFixture(deployFixture);

            await time.increaseTo(startDate + 1000);

            const amount = ethers.parseEther("1");

            await crowdSale.connect(tokensBuyer).buyTokens(tokensBuyer, {value: amount});

            await time.increaseTo(endDate + 1);

            await expect(
                crowdSale.connect(crowdSaleOwner).finalizeSale()
            ).to.changeEtherBalance(feeReceiver.address, amount);
        });
    })

  })