// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract TwasToken is ERC20, Ownable {
    uint256 public constant TOTAL_SUPPLY = 10_000_000 * 10**18; // 10M tokens with 18 decimals

    constructor(string memory name, string memory symbol) 
        ERC20(name, symbol)
        Ownable(msg.sender)
    {
        _mint(msg.sender, TOTAL_SUPPLY);
    }
} 