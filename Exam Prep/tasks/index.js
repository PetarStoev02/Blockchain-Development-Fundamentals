const { task } = require("hardhat/config");

task("deploy", "Deploys CustomNFT and AuctionHouse contracts")
  .setAction(async(_, hre)=>{
        const[deployer] = await hre.ethers.getSigners();

        console.log("Deploying with owner", deployer.address)
        console.log("Deploying CustomNFT Token contract...");
        const customNFTFactory = await hre.ethers.getContractFactory("CustomNFT");
        const customToken = await customNFTFactory.connect(deployer).deploy(deployer.address);
        await customToken.waitForDeployment();
        console.log("CustomNFT Token deployed to", await customToken.getAddress());

        console.log("Deploying Auction House contract...");
        const auctionHouseFactory = await hre.ethers.getContractFactory("AuctionHouse");
        const auctionHouse = await auctionHouseFactory.deploy(await customToken.getAddress());
        await auctionHouse.waitForDeployment();
        console.log("Auction House deployed to", await auctionHouse.getAddress());

  });
