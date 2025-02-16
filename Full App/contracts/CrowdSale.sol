// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ICustomToken} from "./ICustomToken.sol";

error NotOwner();
error InvalidSaleStartTime();
error InvalidSaleEndTime();
error InvalidSaleRate();
error InvalidSaleFeeReceiver();
error InactiveSale();
error InsufficientAmountForTokenExchange();
error InsufficientTokenBallance();
error UnsuccessfullTokenTransfer();
error SaleCannotBeFinalized();
error TransferToFeeReceiverFailed();
error SaleIsStillActive();
error NoAmountToRefund();
error SoftCapMet();


contract CrowdSale is Ownable{
    
    event SaleCreated(uint256 indexed startTime, uint256 indexed endTime, address feeReceiver);
    event TokensSuccessfullyExchanged(address receiver, uint256 tokenAmount);
    event SaleFinalized(uint256 indexed finalizationTime);

    uint256 public startTime;
    uint256 public endTime;
    uint256 public rate;
    address public feeReceiver;
    uint256 public fundRaised;
    bool public isFinalized;
    uint256 public tokensTotalAmount;
    uint256 public tokensSold;

    address public token;

    constructor(address owner) Ownable(owner) {}

    function createSale(
        uint256 _startTime,
        uint256 _endTime,
        uint256 _rate,
        address _feeReceiver, 
        uint256 _tokensTotalAmount,
        address _token) 
    external onlyOwner{

        if(_startTime < block.timestamp) revert InvalidSaleStartTime();
        if(_endTime <= _startTime) revert InvalidSaleEndTime();
        if(_rate <= 0) revert InvalidSaleRate();
        if(_feeReceiver == address(0)) revert InvalidSaleFeeReceiver();

        startTime = _startTime;
        endTime = _endTime;
        rate = _rate;
        feeReceiver = _feeReceiver;
        fundRaised = 0;
        isFinalized = false;
        tokensTotalAmount = _tokensTotalAmount;
        token = _token;

        ICustomToken(token).transferFrom(msg.sender, address(this), tokensTotalAmount);

        emit SaleCreated(_startTime, _endTime, _feeReceiver);
    }

    function buyTokens(address receiver) public payable{
        if(block.timestamp <startTime || block.timestamp > endTime || isFinalized) revert InactiveSale();
        if(msg.value == 0) revert InsufficientAmountForTokenExchange();

        uint256 amount = (msg.value*rate * 10 ** ICustomToken(token).decimals())/ 1 ether;

        if(tokensSold + amount > tokensTotalAmount) revert InsufficientTokenBallance();

        tokensSold+= amount;
        ICustomToken(token).transfer(receiver, amount);

        emit TokensSuccessfullyExchanged(msg.sender, amount);

    }

    function finalizeSale() public onlyOwner payable{
        if(block.timestamp < endTime && tokensTotalAmount > tokensSold) revert SaleCannotBeFinalized();
        isFinalized = true;
        
        (bool success, ) = feeReceiver.call{value: address(this).balance}("");
        if(!success) revert TransferToFeeReceiverFailed();

        //transfer the tokens that have not been bought back to owner
        ICustomToken(token).transfer(owner(), ICustomToken(token).balanceOf(address(this)));

        emit SaleFinalized(block.timestamp);
    }


}