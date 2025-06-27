"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var crossmintNFTScenario = {
    name: 'Payment: Crossmint NFT Minting and Trading',
    description: 'Demonstrates using Crossmint for NFT minting, purchasing, and cross-chain operations',
    category: 'payment',
    examples: [
        [
            {
                user: 'alice',
                content: 'Mint an NFT of my digital artwork on Ethereum using credit card',
            },
            {
                user: 'agent',
                content: 'Initiating NFT mint via Crossmint: Your artwork will be minted on Ethereum mainnet. Cost: $25 (includes gas). Payment via credit card accepted. Metadata uploading to IPFS...',
                action: 'CROSSMINT_NFT_MINT',
            },
        ],
        [
            {
                user: 'bob',
                content: 'Buy the Bored Ape #1234 NFT with my Visa card',
            },
            {
                user: 'agent',
                content: 'Processing NFT purchase through Crossmint:\nBored Ape #1234 - Price: 45 ETH ($101,250)\nPayment: Visa ending in 4242\nCrossmint fee: 4.5%\nTotal: $105,806.25\nRequires verification for high-value purchase.',
                action: 'CROSSMINT_NFT_PURCHASE',
            },
        ],
        [
            {
                user: 'charlie',
                content: 'Bridge my Solana NFT collection to Polygon',
            },
            {
                user: 'agent',
                content: 'Setting up cross-chain NFT bridge via Crossmint:\nSource: Solana (15 NFTs detected)\nDestination: Polygon\nEstimated time: 10-15 minutes\nBridge fee: $3.50 per NFT\nTotal cost: $52.50',
                action: 'CROSSMINT_NFT_BRIDGE',
            },
        ],
    ],
    actions: ['CROSSMINT_NFT_MINT', 'CROSSMINT_NFT_PURCHASE', 'CROSSMINT_NFT_BRIDGE'],
    evaluator: function (response) {
        var hasCrossmint = response.toLowerCase().includes('crossmint');
        var hasNFT = response.toLowerCase().includes('nft') ||
            response.toLowerCase().includes('mint') ||
            response.toLowerCase().includes('artwork');
        var hasPayment = response.toLowerCase().includes('card') ||
            response.toLowerCase().includes('visa') ||
            response.toLowerCase().includes('payment') ||
            response.toLowerCase().includes('cost');
        var hasBlockchain = response.toLowerCase().includes('ethereum') ||
            response.toLowerCase().includes('solana') ||
            response.toLowerCase().includes('polygon') ||
            response.toLowerCase().includes('bridge');
        return hasCrossmint && hasNFT && (hasPayment || hasBlockchain);
    },
    tags: ['payment', 'crossmint', 'nft', 'minting', 'bridge'],
};
exports.default = crossmintNFTScenario;
