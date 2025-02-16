// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

error NotOwner();
error InvalidListing();
error ListingNotActive();
error PriceTooLow();
error DurationInvalid();
error NotNFTOwner();
error MarketplaceNotApproved();
error NotAnAuction();
error AuctionEnded();
error SellerCannotBid();
error BidTooLow();
error IsAuction();
error InsufficientPayment();
error SellerCannotBuy();
error AuctionNotEnded();
error NotAuthorized();
error CannotCancelAuctionWithBids();
error NoPendingReturns();
error FeeTooHigh();

/**
 * @title NFTMarketplace
 * @notice A decentralized marketplace for trading NFTs with support for fixed-price sales and auctions
 * @dev Implements ReentrancyGuard for security against reentrancy attacks
 */
import "hardhat/console.sol";

contract NFTMarketplace is ReentrancyGuard {
    /**
     * @notice Structure representing an NFT listing
     * @param seller Address of the NFT owner
     * @param price Initial price or minimum bid for auctions
     * @param tokenId ID of the listed NFT
     * @param nftContract Address of the NFT contract
     * @param deadline Timestamp when the listing/auction ends
     * @param isAuction Whether the listing is an auction
     * @param highestBidder Current highest bidder in an auction
     * @param highestBid Current highest bid amount
     * @param active Whether the listing is still active
     */
    struct Listing {
        address seller;
        uint256 price;
        uint256 tokenId;
        address nftContract;
        uint256 deadline;
        bool isAuction;
        address highestBidder;
        uint256 highestBid;
        bool active;
    }

    /**
     * @notice Structure for tracking auction bid history
     * @param bidder Address of the bidder
     * @param amount Bid amount in wei
     * @param timestamp When the bid was placed
     */
    struct Bid {
        address bidder;
        uint256 amount;
        uint256 timestamp;
    }

    mapping(uint256 => Listing) public listings;
    mapping(uint256 => Bid[]) public bidsHistory;
    mapping(address => uint256) public pendingReturns;

    uint256 public listingCounter;
    uint256 public marketplaceFee = 250; // 2.5%
    address public owner;

    event ListingCreated(
        uint256 indexed listingId,
        address indexed seller,
        address indexed nftContract,
        uint256 tokenId,
        uint256 price,
        bool isAuction,
        uint256 deadline
    );
    event BidPlaced(uint256 indexed listingId, address indexed bidder, uint256 amount);
    event ListingSold(uint256 indexed listingId, address indexed buyer, uint256 price);
    event ListingCanceled(uint256 indexed listingId);
    event MarketplaceFeeUpdated(uint256 newFee);

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier listingExists(uint256 _listingId) {
        if (_listingId >= listingCounter) revert InvalidListing();
        _;
    }

    modifier activeListing(uint256 _listingId) {
        if (!listings[_listingId].active) revert ListingNotActive();
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * @notice Creates a new NFT listing
     * @param _nftContract Address of the NFT contract
     * @param _tokenId Token ID of the NFT
     * @param _price Starting price for fixed-price sale or minimum bid for auction
     * @param _isAuction Whether this is an auction listing
     * @param _duration Duration of the listing in seconds
     * @dev Requires NFT approval for the marketplace contract
     */
    function createListing(
        address _nftContract,
        uint256 _tokenId,
        uint256 _price,
        bool _isAuction,
        uint256 _duration
    )
        external
        nonReentrant
    {
        if (_price == 0) revert PriceTooLow();
        if (_duration == 0) revert DurationInvalid();

        IERC721 nft = IERC721(_nftContract);
        if (nft.ownerOf(_tokenId) != msg.sender) revert NotNFTOwner();
        if (!nft.isApprovedForAll(msg.sender, address(this))) revert MarketplaceNotApproved();

        uint256 listingId = listingCounter++;
        listings[listingId] = Listing({
            seller: msg.sender,
            price: _price,
            tokenId: _tokenId,
            nftContract: _nftContract,
            deadline: block.timestamp + _duration,
            isAuction: _isAuction,
            highestBidder: address(0),
            highestBid: 0,
            active: true
        });

        emit ListingCreated(
            listingId, msg.sender, _nftContract, _tokenId, _price, _isAuction, block.timestamp + _duration
        );
    }

    /**
     * @notice Places a bid on an auction listing
     * @param _listingId ID of the auction listing
     * @dev Automatically refunds the previous highest bidder
     */
    function placeBid(uint256 _listingId)
        external
        payable
        nonReentrant
        listingExists(_listingId)
        activeListing(_listingId)
    {
        Listing storage listing = listings[_listingId];
        if (!listing.isAuction) revert NotAnAuction();
        if (block.timestamp >= listing.deadline) revert AuctionEnded();
        if (msg.sender == listing.seller) revert SellerCannotBid();
        if (msg.value <= listing.highestBid || msg.value < listing.price) revert BidTooLow();

        if (listing.highestBidder != address(0)) {
            pendingReturns[listing.highestBidder] += listing.highestBid;
        }

        listing.highestBidder = msg.sender;
        listing.highestBid = msg.value;

        bidsHistory[_listingId].push(Bid({bidder: msg.sender, amount: msg.value, timestamp: block.timestamp}));

        emit BidPlaced(_listingId, msg.sender, msg.value);
    }

    /**
     * @notice Purchases an NFT at the listed fixed price
     * @param _listingId ID of the fixed-price listing
     * @dev Transfers the NFT and handles payment distribution
     */
    function buyNow(uint256 _listingId)
        external
        payable
        nonReentrant
        listingExists(_listingId)
        activeListing(_listingId)
    {
        Listing storage listing = listings[_listingId];
        if (listing.isAuction) revert IsAuction();
        if (msg.value < listing.price) revert InsufficientPayment();
        if (msg.sender == listing.seller) revert SellerCannotBuy();

        _completeSale(_listingId, msg.value);
    }

    function _completeSale(uint256 _listingId, uint256 _amount) internal {
        Listing storage listing = listings[_listingId];
        listing.active = false;

        uint256 fee = (_amount * marketplaceFee) / 10_000;
        uint256 sellerAmount = _amount - fee;

        IERC721(listing.nftContract).transferFrom(listing.seller, msg.sender, listing.tokenId);

        payable(listing.seller).transfer(sellerAmount);
        payable(owner).transfer(fee);

        emit ListingSold(_listingId, msg.sender, _amount);
    }

    /**
     * @notice Completes an auction after its deadline
     * @param _listingId ID of the auction listing
     * @dev Transfers NFT to highest bidder or cancels if no bids
     */
    function finalizeAuction(uint256 _listingId)
        external
        nonReentrant
        listingExists(_listingId)
        activeListing(_listingId)
    {
        Listing storage listing = listings[_listingId];
        if (!listing.isAuction) revert NotAnAuction();
        if (block.timestamp < listing.deadline) revert AuctionNotEnded();

        if (listing.highestBidder != address(0)) {
            _completeSale(_listingId, listing.highestBid);
        } else {
            listing.active = false;
            emit ListingCanceled(_listingId);
        }
    }

    /**
     * @notice Allows seller or owner to cancel a listing
     * @param _listingId ID of the listing to cancel
     * @dev Cannot cancel auctions with active bids
     */
    function cancelListing(uint256 _listingId) external listingExists(_listingId) activeListing(_listingId) {
        Listing storage listing = listings[_listingId];
        if (msg.sender != listing.seller && msg.sender != owner) revert NotAuthorized();
        if (listing.isAuction && listing.highestBidder != address(0)) revert CannotCancelAuctionWithBids();

        listing.active = false;
        emit ListingCanceled(_listingId);
    }

    /**
     * @notice Allows users to withdraw their refunded bids
     * @dev Used when a higher bid is placed or an auction is cancelled
     */
    function withdrawPendingReturns() external nonReentrant {
        uint256 amount = pendingReturns[msg.sender];
        if (amount == 0) revert NoPendingReturns();

        pendingReturns[msg.sender] = 0;
        payable(msg.sender).transfer(amount);
    }

    /**
     * @notice Updates the marketplace fee percentage
     * @param _newFee New fee in basis points (e.g., 250 = 2.5%)
     * @dev Only callable by marketplace owner, maximum 10%
     */
    function updateMarketplaceFee(uint256 _newFee) external onlyOwner {
        if (_newFee > 1000) revert FeeTooHigh(); // Max 10%
        marketplaceFee = _newFee;
        emit MarketplaceFeeUpdated(_newFee);
    }
}
