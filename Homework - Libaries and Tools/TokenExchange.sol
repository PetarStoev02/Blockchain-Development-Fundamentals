// SPDX-License-Identifier: MIT

pragma solidity 0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract SoftCoin is ERC20 {
    constructor() ERC20("SoftCoin", "SC"){}

    function mint(uint256 amount) public{
        _mint(msg.sender, amount);
    }
}

contract UniCoin is ERC20, Ownable {
    constructor() ERC20("UniCoin", "UC")  Ownable(msg.sender){}

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}

contract TokenExchange is Ownable{

    SoftCoin public  softCoinAddress;
    UniCoin public uniCoinAddress;

    //TODO - decouple dependencies between contracts by transfering ownership
    constructor() Ownable(msg.sender){
        softCoinAddress = new SoftCoin();
        uniCoinAddress = new UniCoin();
    }

    function trade(uint256 amount) external onlyOwner{
        require(softCoinAddress.transferFrom(msg.sender, address(this), amount), "SoftCoin transfer failed");
        uniCoinAddress.mint(msg.sender, amount);
    }

}