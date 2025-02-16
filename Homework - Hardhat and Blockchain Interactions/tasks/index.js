

task("accounts", "Prints the list of accounts",
    async (taskArgs, hre) => {
    const accounts = await hre.ethers.getSigners();
    for (const account of accounts) {
    console.log(account.address);
    }
    });

// display balance
    task("balance", "Prints balance of given account")
    .setAction(async(_, hre) => {
        const provider = hre.ethers.provider;

        const result =await  provider.getBalance("0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266");
        console.log("Formatted to ETH: ", hre.ethers.formatEther(result));
    })

// display current block number
    task("blockNum", "Displays current block number")
    .setAction(async(_, hre)=> {
        const provider =  hre.ethers.provider;
        const result = await provider.getBlockNumber();

        console.log(result);
    })
    
// transfer ETH 
    task("send", "Sends amount specified")
    .addParam("address", "recipient of the transfer")
    .addParam("amount", "Amount to be transfered")
    .setAction(async (taskParams, hre) => {
        const [sender] = await hre.ethers.getSigners();
        const tx = await sender.sendTransaction({
            to: taskParams.address,
            value: ethers.parseEther(taskParams.amount)
        });

        console.log("Tx send!");
        console.log(tx);

        const receipt = await tx.wait();
        console.log("Tx mined!");
        console.log(receipt);
    })

// Homework tasks mint and transfer

    task("mint", "Mints ERC20 tokens to given address")
    .addParam("contract", "address of the contract")
    .addParam("to", "address to mint to")
    .addParam("amount", "tokens to be minted")
    .setAction(async(taskParams, hre) => {
        try{
            const contract = await hre.ethers.getContractAt("Token", taskParams.contract);
            await contract.mint(taskParams.to, await ethers.parseEther(taskParams.amount));

            console.log(`Minted ${taskParams.amount} tokens to ${taskParams.to}`);
        } catch(err) {
            console.log(err);
        }
    })


    task("transfer", "Transfers tokens from one address to another")
    .addParam("contract", "address of the contract")
    .addParam("from", "address to transfer from")
    .addParam("to", "address to transfer to")
    .addParam("amount", "tokens to be minted")
    .setAction(async(taskParams, hre)=> {
        try {
            const contract = await hre.ethers.getContractAt("Token",taskParams.contract);

            const amount = hre.ethers.parseEther(taskParams.amount);
            await contract.transferFrom(taskParams.from, taskParams.to,amount);

            console.log(`Transferred ${taskParams.amount} tokens from ${taskParams.from} to ${taskParams.to}`);
        } catch(err) {
            console.log(err);
        }

    })