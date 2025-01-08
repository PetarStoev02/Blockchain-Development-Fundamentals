// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract DigitalLibrary {
    enum Status { Active, Outdated, Archived }

    struct EBook {
        string title;
        string author;
        uint256 publicationDate;
        uint256 expirationDate;
        Status status;
        address primaryLibrarian;
        uint256 readCount;
    }

    mapping(uint256 => EBook) public ebooks;
    mapping(uint256 => mapping(address => bool)) public authorizedLibrarians;
    uint256 public ebookCount;

    modifier onlyPrimaryLibrarian(uint256 ebookId) {
        require(msg.sender == ebooks[ebookId].primaryLibrarian, "Not the primary librarian");
        _;
    }

    modifier onlyAuthorizedLibrarian(uint256 ebookId) {
        require(
            authorizedLibrarians[ebookId][msg.sender] || msg.sender == ebooks[ebookId].primaryLibrarian,
            "Not an authorized librarian"
        );
        _;
    }

    function createEBook(
        string calldata title,
        string calldata author,
        uint256 publicationDate,
        uint256 expirationDays
    ) external {
        uint256 expirationDate = block.timestamp + (expirationDays * 1 days);
        ebooks[ebookCount] = EBook({
            title: title,
            author: author,
            publicationDate: publicationDate,
            expirationDate: expirationDate,
            status: Status.Active,
            primaryLibrarian: msg.sender,
            readCount: 0
        });
        authorizedLibrarians[ebookCount][msg.sender] = true;
        ebookCount++;
    }

    function addLibrarian(uint256 ebookId, address librarian) external onlyPrimaryLibrarian(ebookId) {
        authorizedLibrarians[ebookId][librarian] = true;
    }

    function extendExpirationDate(uint256 ebookId, uint256 extraDays) external onlyAuthorizedLibrarian(ebookId) {
        ebooks[ebookId].expirationDate += extraDays * 1 days;
    }

    function changeStatus(uint256 ebookId, Status newStatus) external onlyPrimaryLibrarian(ebookId) {
        ebooks[ebookId].status = newStatus;
    }

    function checkExpiration(uint256 ebookId) external returns (bool) {
        ebooks[ebookId].readCount++;
        return block.timestamp > ebooks[ebookId].expirationDate;
    }
}
