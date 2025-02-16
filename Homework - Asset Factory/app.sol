// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Asset {
    string public symbol;
    string public name;
    uint256 public totalSupply;
    mapping(address => uint256) public balances;

    event Transfer(address indexed from, address indexed to, uint256 value);

    constructor(string memory _symbol, string memory _name, uint256 _initialSupply) {
        symbol = _symbol;
        name = _name;
        totalSupply = _initialSupply;
        balances[msg.sender] = _initialSupply;
    }

    function transfer(address to, uint256 amount) public returns (bool) {
        require(balances[msg.sender] >= amount, "Insufficient balance");
        balances[msg.sender] -= amount;
        balances[to] += amount;
        emit Transfer(msg.sender, to, amount);
        return true;
    }

    function balanceOf(address account) public view returns (uint256) {
        return balances[account];
    }
}

contract AssetFactory {
    mapping(string => address) public assetAddresses;

    event AssetCreated(string symbol, address assetAddress);
    event AssetTransferred(address assetAddress, address from, address to, uint256 amount);

    function createAsset(string memory symbol, string memory name, uint256 initialSupply) public {
        require(assetAddresses[symbol] == address(0), "Asset with this symbol already exists");
        Asset newAsset = new Asset(symbol, name, initialSupply);
        assetAddresses[symbol] = address(newAsset);
        emit AssetCreated(symbol, address(newAsset));
    }

    function getAssetAddress(string memory symbol) public view returns (address) {
        return assetAddresses[symbol];
    }

    function transferAsset(string memory symbol, address to, uint256 amount) public {
        address assetAddress = assetAddresses[symbol];
        require(assetAddress != address(0), "Asset not found");

        Asset(assetAddress).transfer(to, amount);
        emit AssetTransferred(assetAddress, msg.sender, to, amount);
    }
}
