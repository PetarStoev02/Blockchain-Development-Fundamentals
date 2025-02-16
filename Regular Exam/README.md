# StakeX Protocol

A decentralized staking protocol that allows users to stake tokens and earn rewards. Built with Hardhat and Solidity.

## Features

- ERC20 token (StakeX) with minting capabilities
- Staking pool with annual rewards (5% APY)
- Role-based access control
- Automated reward distribution
- Secure unstaking mechanism

## Technical Stack

- Solidity ^0.8.27
- Hardhat
- TypeScript
- OpenZeppelin Contracts
- Ethers.js

## Getting Started

### Prerequisites

- Node.js >= 14
- npm or yarn
- An Ethereum wallet with testnet ETH

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd stakex-protocol
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file:
```env
SEPOLIA_URL=your_sepolia_rpc_url
PRIVATE_KEY=your_wallet_private_key
ETHERSCAN_API_KEY=your_etherscan_api_key
```

### Testing

Run the test suite:
```bash
npx hardhat test
```

For gas reporting:
```bash
REPORT_GAS=true npx hardhat test
```

### Deployment

Option 1: Using Hardhat Task (Recommended):
```bash
npx hardhat deploy --network sepolia --verify true
```

Option 2: Using Hardhat Ignition:
```bash
# 1. Deploy contracts
npx hardhat ignition deploy ./ignition/modules/StakeXModule.ts --network sepolia

# 2. Verify contracts (after deployment)
npx hardhat verify --network sepolia 0x7274884ef6D98E97a964C82b7bc38260272F790a  0xc9601ede9cddd20a562755c35c1b1dc7d2de2e61 
```

## Contract Addresses

- Sepolia Testnet:
  - StakeX Token: [`0xCAC266E7dDdf194fdEf50828ABac2c55507b1B25`](https://sepolia.etherscan.io/address/0xCAC266E7dDdf194fdEf50828ABac2c55507b1B25#code)
  - Staking Pool: [`0x7274884ef6D98E97a964C82b7bc38260272F790a`](https://sepolia.etherscan.io/address/0x7274884ef6D98E97a964C82b7bc38260272F790a#code)

## Documentation

### Core Contracts

- `StakeX.sol`: ERC20 token with minting capabilities and role-based access
- `StakingPool.sol`: Staking mechanism with reward distribution

### Key Functions

**StakeX Token:**
- `mint`: Create new tokens (MINTER_ROLE only)
- `grantMinterRole`: Assign minting privileges
- `revokeMinterRole`: Remove minting privileges

**Staking Pool:**
- `stake`: Deposit tokens for staking
- `unstake`: Withdraw staked tokens
- `claimRewards`: Collect accumulated rewards
- `getStakerInfo`: View staking position and rewards

## Security

- Role-based access control
- Reentrancy protection
- Secure math operations
- Input validation

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
