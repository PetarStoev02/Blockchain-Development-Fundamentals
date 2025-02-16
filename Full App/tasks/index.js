const { task } = require("hardhat/config");

task("deploy", "Deploys CustomToken and Crowdsale contracts")
  .addParam("startOffset", "Sale start time offset in seconds from now", "1000")
  .addParam("saleDuration", "The duration of the sale", (7 * 24 * 60 * 60).toString())
  .addParam("rate", "The price to buy a token", "50")
  .setParam("tokenTotalAmount", "The total amount of tokens that can be sold", "50000")
  .addParam("feeReceiver", "The account to which amount will be transfered after finalization")
  .setAction(async(taskArgs, hre)=>{
        const[crowdSaleOwner] = await hre.ethers.getSigners();

        console.log("Deploying with owner", crowdSaleOwner.address)
        const startOffset = parseInt(taskArgs.startOffset);
        const saleDuration = parseInt(taskArgs.saleDuration);
        const rate = parseInt(taskArgs.rate);
        const tokenTotalAmount = await hre.ethers.parseUnits(taskArgs.tokenTotalAmount, 8)
        const feeReceiver = taskArgs.feeReceiver || crowdSaleOwner.address;


        console.log("Deploying CustomToken contract...");
        const customTokenFactory = await hre.ethers.getContractFactory("CustomToken");
        const customToken = await customTokenFactory.deploy();
        await customToken.waitForDeployment();
        console.log("Custom Token deployed to", await customToken.getAddress());

        console.log("Deploying CrowdSale contract...");
        const crowdSaleFactory = await hre.ethers.getContractFactory("CrowdSale");
        const crowdSale = await crowdSaleFactory.deploy();
        await crowdSale.waitForDeployment();
        console.log("Crowdsale deployed to", await crowdSale.getAddress());


        console.log("Setting Sale Parameters...");

        const startTime = await hre.ethers.provider.getBlock("latest") + startOffset;
        const endTime = startTime + saleDuration;

        await customToken.approve(await crowdSale.getAddress(), tokenTotalAmount);

        await crowdSale.createSale(
            startTime,
            endTime,
            rate,
            feeReceiver,
            tokenTotalAmount,
            await customToken.getAddress()
        )

  });

  task("buy", "Buys tokens buy transfering certain amount of ethers")
  .addParam("amount", "Amount of ethers send")
  .addParam("receiver", "Address of the receiver")
  .addParam("crowdSale", "Address of the crowdSale contract")
  .setAction(async(taskArgs, hre)=>{
        const [buyer] = await hre.ethers.getSigners();

        const amount = hre.ethers.parseEther(taskArgs.amount);
        const crowdSaleAddress = taskArgs.crowdSale;
        const receiver = taskArgs.receiver || buyer.address;

        const crowdSaleFactory = await hre.ethers.getContractFactory("CrowdSale");
        const crowdSale = crowdSaleFactory.attach(crowdSaleAddress);

        const tx = await crowdSale.buyTokens(receiver, {value: amount});
        await tx.wait();

  })