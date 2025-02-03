import {
    ActionExample,
    Content,
    generateText,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    ModelClass,
    State,
    type Action,
    elizaLogger,
} from "@elizaos/core";
import { ethers } from "ethers";

// OpenZeppelin ERC721 contract template with fixed supply
const CONTRACT_TEMPLATE = `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

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
}`;

export const MintTokenAction: Action = {
    name: "MINT_TWAS_NFT",
    similes: ["CREATE_TWAS_NFT"],
    description: "Creates a new NFT token with fixed supply of 10M tokens",
    handler: async (runtime: IAgentRuntime, message: Memory, state: State, options: object, callback: HandlerCallback) => {
        try {
            // Get private key and RPC URL from environment
            const privateKey = process.env.TWAS_PRIVATE_KEY;
            const rpcUrl = process.env.TWAS_RPC_URL;

            if (!privateKey || !rpcUrl) {
                throw new Error("TWAS_PRIVATE_KEY or TWAS_RPC_URL not found in environment variables");
            }

            // Setup provider and wallet
            const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
            const wallet = new ethers.Wallet(privateKey, provider);

            // Compile contract
            const solc = require('solc');
            const input = {
                language: 'Solidity',
                sources: {
                    'TwasNFT.sol': {
                        content: CONTRACT_TEMPLATE
                    }
                },
                settings: {
                    outputSelection: {
                        '*': {
                            '*': ['*']
                        }
                    }
                }
            };

            elizaLogger.debug("Compiling contract...");
            const output = JSON.parse(solc.compile(JSON.stringify(input)));
            const contract = output.contracts['TwasNFT.sol'].TwasNFT;

            if (!contract) {
                throw new Error("Contract compilation failed");
            }

            // Estimate gas with buffer
            const factory = new ethers.ContractFactory(
                contract.abi,
                contract.evm.bytecode.object,
                wallet
            );

            const name = message.content.name || "TwasNFT";
            const symbol = message.content.symbol || "TWAS";

            // Estimate deployment gas
            const deploymentGas = await factory.signer.estimateGas(
                factory.getDeployTransaction(name, symbol)
            );
            const gasLimit = Math.floor(deploymentGas.toNumber() * 1.2); // 20% buffer

            elizaLogger.debug("Deploying contract...");
            const deployTx = await factory.deploy(name, symbol, { gasLimit });
            await deployTx.deployed();

            elizaLogger.info("Contract deployed to:", deployTx.address);

            callback(
                {
                    text: `Successfully deployed NFT contract at ${deployTx.address} with 10,000,000 tokens minted to ${wallet.address}`,
                    contractAddress: deployTx.address,
                    totalSupply: 10000000
                },
                []
            );
        } catch (error) {
            elizaLogger.error("Error deploying NFT contract:", error);
            elizaLogger.error("Error details:", {
                message: error.message,
                stack: error.stack,
                reason: error.reason,
                code: error.code,
                data: error.data
            });
            callback(
                {
                    text: `Failed to deploy NFT contract: ${error.message}`,
                },
                []
            );
        }
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Create a new NFT token",
                    name: "MyTwasNFT",
                    symbol: "TWAS"
                },
            },
            {
                user: "{{user2}}",
                content: { text: "Successfully deployed NFT contract at 0x... with 10,000,000 tokens minted to 0x..." },
            },
        ],
    ],
    validate: async (runtime: IAgentRuntime, message: Memory, state?: State): Promise<boolean> => {
        return !!(process.env.TWAS_PRIVATE_KEY && process.env.TWAS_RPC_URL);
    }
};
