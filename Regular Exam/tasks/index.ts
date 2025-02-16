import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";

interface DeployArgs {
  initialSupply?: string;
  verify: string;
}

interface StakeArgs {
  amount: string;
  stakingPool: string;
}

task("deploy", "Deploys StakeX and StakingPool contracts")
  .addOptionalParam("initialSupply", "Initial supply of tokens (default: 5000000)")
  .addOptionalParam("verify", "Verify contracts on Etherscan", "true")
  .setAction(async (taskArgs: DeployArgs, hre: HardhatRuntimeEnvironment) => {
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying contracts with account:", deployer.address);

    // Deploy StakeX
    console.log("Deploying StakeX token...");
    const StakeX = await hre.ethers.getContractFactory("StakeX");
    const stakeX = await StakeX.deploy();
    await stakeX.waitForDeployment();
    const stakeXAddress = await stakeX.getAddress();
    console.log("StakeX deployed to:", stakeXAddress);

    // Deploy StakingPool
    console.log("Deploying StakingPool...");
    const StakingPool = await hre.ethers.getContractFactory("StakingPool");
    const stakingPool = await StakingPool.deploy(stakeXAddress);
    await stakingPool.waitForDeployment();
    const stakingPoolAddress = await stakingPool.getAddress();
    console.log("StakingPool deployed to:", stakingPoolAddress);

    // Grant MINTER_ROLE to StakingPool
    const MINTER_ROLE = await stakeX.MINTER_ROLE();
    await stakeX.grantRole(MINTER_ROLE, stakingPoolAddress);
    console.log("Granted MINTER_ROLE to StakingPool");

    // Wait for few block confirmations
    await stakeX.deploymentTransaction()?.wait(5);
    await stakingPool.deploymentTransaction()?.wait(5);

    // Verify if requested and not on hardhat network
    if (taskArgs.verify === "true" && hre.network.name !== "hardhat") {
      console.log("Verifying contracts...");
      try {
        // Verify StakeX
        await hre.run("verify:verify", {
          address: stakeXAddress,
          constructorArguments: [],
        });
        console.log("StakeX verified");

        // Verify StakingPool
        await hre.run("verify:verify", {
          address: stakingPoolAddress,
          constructorArguments: [stakeXAddress],
        });
        console.log("StakingPool verified");
      } catch (error) {
        console.log("Verification error:", error);
      }
    }

    // Print summary
    console.log("\nDeployment Summary:");
    console.log("===================");
    console.log(`Network: ${hre.network.name}`);
    console.log(`StakeX Token: ${stakeXAddress}`);
    console.log(`StakingPool: ${stakingPoolAddress}`);
    console.log("\nVerify contracts at:");
    console.log(`https://${hre.network.name}.etherscan.io/address/${stakeXAddress}`);
    console.log(`https://${hre.network.name}.etherscan.io/address/${stakingPoolAddress}`);
  });

task("stake", "Stakes tokens in the StakingPool")
  .addParam("amount", "Amount of tokens to stake")
  .addParam("stakingPool", "Address of the StakingPool contract")
  .setAction(async (taskArgs: StakeArgs, hre: HardhatRuntimeEnvironment) => {
    const [staker] = await hre.ethers.getSigners();
    console.log("Staking with account:", staker.address);

    const amount = hre.ethers.parseUnits(taskArgs.amount, 8); // 8 decimals for StakeX
    const stakingPool = await hre.ethers.getContractAt("StakingPool", taskArgs.stakingPool);
    const stakeX = await hre.ethers.getContractAt("StakeX", await stakingPool.stakingToken());

    // Approve StakingPool to spend tokens
    console.log("Approving tokens...");
    await stakeX.approve(taskArgs.stakingPool, amount);

    // Stake tokens
    console.log(`Staking ${taskArgs.amount} tokens...`);
    const tx = await stakingPool.stake(amount);
    await tx.wait();
    console.log("Staking successful!");

    // Show updated staking info
    const stakerInfo = await stakingPool.getStakerInfo(staker.address);
    console.log("Updated staking balance:", hre.ethers.formatUnits(stakerInfo[0], 8));
    console.log("Unclaimed rewards:", hre.ethers.formatUnits(stakerInfo[1], 8));
  });