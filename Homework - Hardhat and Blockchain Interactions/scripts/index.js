const hre = require("hardhat");

async function main() {
    const accounts = await hre.ethers.getSigners();

    for (const account of accounts) {
        console.log(account.address);
      }
}


main()
.then(()=>process.exit(0))
.catch((err) => {
    console.log(err)
    process.exit(1)
});