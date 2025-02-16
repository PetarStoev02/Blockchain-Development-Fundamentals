import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const StakeXModule = buildModule("StakeXModule", (m) => {
  // Deploy StakeX token
  const stakeX = m.contract("StakeX", []);
  
  // Deploy StakingPool with StakeX address
  const stakingPool = m.contract("StakingPool", [stakeX]);

  // Grant MINTER_ROLE to StakingPool
  const MINTER_ROLE = m.staticCall(stakeX, "MINTER_ROLE", []);
  m.call(stakeX, "grantRole", [MINTER_ROLE, stakingPool]);

  return { stakeX, stakingPool };
});

export default StakeXModule; 