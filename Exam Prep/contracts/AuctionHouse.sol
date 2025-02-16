// SPDX-License-Identifier: MIT
pragma solidity 0.8.25;

import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";

error InvalidPrice();
error InvalidStartDate();
error InvalidAuctionPeriod();
error InvalidBidIncrement();
error InvalidTimeExtension();
error UnauthorizedAccessToNFT();
error AuctionHouseNotApproved();
error InvalidAuction();
error BiddingValueTooLow();
error InactiveAuction();
error BidStillActive();
error AuctionAlreadyFinalized();
error PriceNotPaidToOwner();
error PriceNotReturnedToBidder();
error UnsuccessfullWithdraw();

contract AuctionHouse{
    struct Auction {
        address seller;
        uint256 tokenId;
        uint256 lowestPrice;
        uint256 startDate;
        uint256 endDate;
        uint256 smallestBidIncrement;
        uint256 timeExtension;
        uint256 extensionWindowStartTime;
        bool isFinalized;
        address highestBidder;
        uint256 highestBid;
    }

    event NFTListed(
        uint256 indexed tokenId,
        address indexed owner, 
        uint256 indexed lowestPrice, 
        uint256 startDate,
        uint256 endDate
    );

    event BidPlaced (
        address indexed bidder,
        uint256 indexed bid,
        uint256 timestamp
    );

    event TokenReturnToOwner(
        address indexed owner, 
        uint256 indexed tokenId,
        uint256 timestamp
    );

    event NFTTransfered(
        address indexed buyer, 
        uint256 indexed tokenId, 
        uint256 timestamp
    );

    event BidWithdrawn(
        address indexed bidder, 
        uint256 indexed amount, 
        uint256 timestamp
    );

    address public token;
    uint256 public auctionsCounter;
    mapping(uint256 => Auction) public auctions;
    mapping(address => uint256) public pendingReturns;

    constructor(address _token) {
        token = _token;
    }

    function listNFTForSale(
        uint256 _tokenId,
        uint256 _lowestPrice,
        uint256 _startDate,
        uint256 _endDate,
        uint256 _smallestBidIncrement,
        uint256 _timeExtension
    ) external {
        if(_lowestPrice == 0) revert InvalidPrice();
        if(_startDate < block.timestamp) revert InvalidStartDate();
        if(_startDate >= _endDate) revert InvalidAuctionPeriod();
        if(_timeExtension == 0 || _endDate - _timeExtension < _startDate) revert InvalidTimeExtension();

        address tokenOwner = IERC721(token).ownerOf(_tokenId);
        if(tokenOwner != msg.sender) revert UnauthorizedAccessToNFT();
        if(IERC721(token).getApproved(_tokenId) != address(this)) revert AuctionHouseNotApproved();
        uint256 extensionWindowStart = _endDate - _timeExtension;

        auctions[auctionsCounter++] = Auction({
            seller: msg.sender,
            tokenId: _tokenId,
            lowestPrice: _lowestPrice,
            startDate: _startDate,
            endDate: _endDate,
            smallestBidIncrement: _smallestBidIncrement,
            timeExtension: _timeExtension,
            extensionWindowStartTime: extensionWindowStart,
            isFinalized: false,
            highestBidder: address(0),
            highestBid: 0
        });
        
        
        IERC721(token).transferFrom(msg.sender, address(this), _tokenId);
        emit NFTListed(_tokenId, msg.sender, _lowestPrice, _startDate, _endDate);        
    }

    function placeBid(uint256 _auctionId) external payable {

        if(_auctionId > auctionsCounter) revert InvalidAuction();
        if( (auctions[_auctionId].highestBidder == address(0) &&  msg.value < auctions[_auctionId].lowestPrice) 
            || msg.value <= auctions[_auctionId].lowestPrice) revert BiddingValueTooLow();
        if( block.timestamp < auctions[_auctionId].startDate 
            || block.timestamp > auctions[_auctionId].endDate
            || auctions[_auctionId].isFinalized) revert InactiveAuction();

        uint256 currentHighestBid = auctions[_auctionId].highestBid;
        address currentHighestBidder = auctions[_auctionId].highestBidder;
        uint256 bidIncrement = auctions[_auctionId].smallestBidIncrement;
        uint256 extensionWindow = auctions[_auctionId].extensionWindowStartTime;
        
        auctions[_auctionId].highestBidder = msg.sender;
        auctions[_auctionId].highestBid = msg.value;
        auctions[_auctionId].lowestPrice = bidIncrement + currentHighestBid;

        pendingReturns[currentHighestBidder] = currentHighestBid;

        if(block.timestamp >= extensionWindow) {
            auctions[_auctionId].endDate += auctions[_auctionId].timeExtension;
            auctions[_auctionId].extensionWindowStartTime = auctions[_auctionId].endDate - auctions[_auctionId].timeExtension;
        }

        emit  BidPlaced ( msg.sender, msg.value, block.timestamp);
    }

    function finalizeAuction(uint256 _auctionId) external payable{

        if(_auctionId > auctionsCounter) revert InvalidAuction();
        if( block.timestamp < auctions[_auctionId].endDate ) revert BidStillActive();
        if(auctions[_auctionId].isFinalized) revert AuctionAlreadyFinalized();

        address highestBidder = auctions[_auctionId].highestBidder;
        uint256 highestBid = auctions[_auctionId].highestBid;
        uint256 sellingPrice = auctions[_auctionId].lowestPrice;
        uint256 tokenId = auctions[_auctionId].tokenId;
        address seller = auctions[_auctionId].seller;

        auctions[_auctionId].isFinalized = true;

        if(highestBidder == address(0)) {
            IERC721(token).transferFrom(address(this), seller, tokenId);
            emit TokenReturnToOwner(seller, tokenId, block.timestamp);
        } else {
            IERC721(token).transferFrom(address(this), highestBidder, tokenId);

            (bool pricePaidToOwner, ) = seller.call{value: sellingPrice}("");
            if(!pricePaidToOwner) revert PriceNotPaidToOwner();

            (bool lockedETHPaidToBidder, ) = highestBidder.call{value: (highestBid - sellingPrice)}("");
            if(!lockedETHPaidToBidder) revert PriceNotReturnedToBidder();

            emit NFTTransfered(highestBidder, tokenId, block.timestamp);
        }
    }

    function withdraw(uint256 _auctionId) external payable{
        if(_auctionId > auctionsCounter) revert InvalidAuction();
        if(!auctions[_auctionId].isFinalized) revert BidStillActive();

        uint256 returnAmount = pendingReturns[msg.sender];
        pendingReturns[msg.sender] = 0;

        (bool success, ) = msg.sender.call{value: returnAmount}("");
        if(!success) revert UnsuccessfullWithdraw();

        emit BidWithdrawn(msg.sender, returnAmount, block.timestamp);
    }
}