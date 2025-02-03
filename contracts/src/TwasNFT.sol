// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract TwasNFT is ERC721, Ownable {
    uint256 public constant TOTAL_SUPPLY = 10000000;
    bool private _hasBeenMinted;

    constructor(string memory name, string memory symbol) ERC721(name, symbol) {
        require(!_hasBeenMinted, "Tokens have already been minted");
        _hasBeenMinted = true;
        
        // Mint all tokens to the contract creator
        for(uint256 i = 1; i <= TOTAL_SUPPLY; i++) {
            _mint(msg.sender, i);
        }
    }

    // Prevent any additional minting
    function _mint(address to, uint256 tokenId) internal virtual override {
        require(!_hasBeenMinted || msg.sender == address(this), "Minting is locked");
        super._mint(to, tokenId);
    }
} 