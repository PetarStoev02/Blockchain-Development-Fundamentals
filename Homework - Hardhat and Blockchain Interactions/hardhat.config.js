require("@nomicfoundation/hardhat-toolbox");
require("./tasks/index.js")

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.28",
  // networks: {
  //   hardhat: {
  //     accounts: [
  //       {
  //         privateKey: "0xdf57089febbacf7ba0bc227dafbffa9fc08a93fdc68e1e42411a14efcf23656e",
  //         balance: "10000000000000000000000" // 10,000 ETH
  //       },
  //       {
  //         privateKey: "0xde9be858da4a475276426320d5e9262ecfc3ba460bfac56360bfa6c4c28b4ee0",
  //         balance: "10000000000000000000000" // 10,000 ETH
  //       },
  //       {
  //         privateKey: "0x689af8efa8c651a91ad287602527f3af2fe9f6501a7ac4b061667b5a93e037fd",
  //         balance: "10000000000000000000000" // 10,000 ETH
  //       }
  //     ]
  //   }
  // }
};