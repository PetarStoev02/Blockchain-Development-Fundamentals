// SPDX-License-Identifier: MIT
pragma solidity 0.8.25;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract CustomNFT is ERC721, Ownable {
    uint256 public nextTokenId;
    uint256 public currentTokenId;

    constructor(address initialOwner)
        ERC721("MyToken", "MTK")
        Ownable(initialOwner)
    {
        //mint the first token with id 0 to the initialOwner
        safeMint(initialOwner);
    }

    function safeMint(address to) public onlyOwner {
        uint256 tokenId = nextTokenId++;
        currentTokenId = tokenId;
        _safeMint(to, tokenId);
    }
}