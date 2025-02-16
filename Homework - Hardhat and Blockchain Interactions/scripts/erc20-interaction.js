const hre = require("hardhat");

async function main() {
    const [owner, player1, player2] = await hre.ethers.getSigners();

    const factory = await hre.ethers.getContractFactory("Token");
    const contract = await factory.deploy(owner.address);

    await contract.deployed;

    console.log("Contract deployed to: ", await contract.getAddress());

    console.log("Player1 balance", await contract.balanceOf(player1.address));
    console.log("Player2 balance", await contract.balanceOf(player2.address));

    const amount = hre.ethers.parseEther("1000");

    await contract.mint(player1.address, amount);
    await contract.mint(player2.address, amount);

    console.log("Updated balance: ");
    console.log("Player1 balance", await contract.balanceOf(player1.address));
    console.log("Player2 balance", await contract.balanceOf(player2.address));
    
}

main()
.then(()=> process.exit(0))
.catch((err) => {
    console.log(err)
    process.exit(1)
});