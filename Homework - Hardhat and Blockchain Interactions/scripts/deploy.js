const hre = require("hardhat");

async function main() {
    const factory = await hre.ethers.getContractFactory("Greeter");
    const contract = await factory.deploy();
    await contract.deployed;

    console.log(await contract.getAddress());
}

main()
.then(()=> process.exit(0))
.catch((err) => {
    console.log(err)
    process.exit(1)
});