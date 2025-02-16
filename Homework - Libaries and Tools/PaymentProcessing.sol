// SPDX-License-Identifier: MIT

pragma solidity 0.8.28;
import "@openzeppelin/contracts/access/AccessControl.sol";

library PaymentLib {
    error InvalidAddress();
    error InsufficientBalance();
    error TransactionFailed();
    function transferETH(address recipient, uint256 transferAmount) internal {

        if(recipient == address(0) ) {
            revert InvalidAddress();
        }

        if(address(this).balance<transferAmount) {
            revert InsufficientBalance();
        }

        (bool success, ) = payable(recipient).call{value:transferAmount}("");

        if(!success) {
            revert TransactionFailed();
        }
    }

    function isContract(address sender) internal view returns (bool result) {
        result = sender.code.length >0;
    }
}


contract PaymentProcessor is AccessControl{
    using PaymentLib for address;

    address public treasury;
    uint256 public allocationPercentage;
    bytes32 public constant TREASURY_ROLE = keccak256("TREASURY_ROLE");

    event TransferCompleted(address indexed sender, address indexed recipient, uint256 amount);
    event TreasuryAllocation(address indexed sender, uint256 amount);

    constructor(address initialTreasury, uint256 initialAllocation) {
        treasury = initialTreasury;
        allocationPercentage = initialAllocation;

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(TREASURY_ROLE, msg.sender);

    }

    function processPayment(address recipient) external payable {
        uint256 treasuryAmount = (msg.value*allocationPercentage)/10000;
        uint256 recipientAmount = msg.value - treasuryAmount;

        treasury.transferETH(treasuryAmount);
        emit TreasuryAllocation(msg.sender, treasuryAmount);

        recipient.transferETH(recipientAmount);
        emit TransferCompleted(msg.sender, recipient, recipientAmount);
    }

    function updateTreasury(address newTreasury) external onlyRole(TREASURY_ROLE) {
        require(newTreasury != address(0), "Invalid Address");
        treasury = newTreasury;
    }


    function updateAllocationPercentage(uint256 newPercentage) external onlyRole(TREASURY_ROLE) {
        require(newPercentage > 0, "Invalid Allocation Percentage");
        allocationPercentage = newPercentage;
     }

}