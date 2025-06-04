/**
 * Alethea AI Protocol Contract Addresses
 */

/**
 * Keys Factory (SharesFactoryV1) Contract Address
 * Contract Reference: https://github.com/AI-Protocol-Official/ai-protocol-v3-periphery/blob/master/contracts/bonding_curves/SharesFactoryV1.sol
 */
export const KEYS_FACTORY_ADDRESS = '0x80f5bcc38b18c0f0a18af3c6fba515c890689342';

/**
 * Implementation Types for ALI Agent creation
 */
export const IMPLEMENTATION_TYPES = {
    ETH: 0,
    ALI: 1,
} as const;

/**
 * Default implementation type for ALI Agent creation
 */
export const DEFAULT_IMPLEMENTATION_TYPE = IMPLEMENTATION_TYPES.ALI;

/**
 * iNFT Keys Factory (SharesFactoryV1) Contract Address (Ethereum Mainnet)
 * Contract Reference: Similar to SharesFactoryV1, but for iNFTs on Mainnet.
 * Guide: https://github.com/AI-Protocol-Official/Documentation/blob/main/guides/convert-inft-to-ali-agent/README.md
 */
export const INFT_KEYS_FACTORY_ADDRESS = '0xABA615044d5640bd151A1B0bdac1C04806AF1AD5';

/**
 * ALI Token Contract Address (Base Mainnet)
 * This is the token used for paying for keys.
 * Reference: https://basescan.org/token/0x97c806e7665d3afd84a8fe1837921403d59f3dcc
 */
export const ALI_TOKEN_ADDRESS = '0x97c806e7665d3afd84a8fe1837921403d59f3dcc';

/**
 * Default Pod NFT Contract Address (e.g., for Level 5 Pods on Base Mainnet)
 * This should be configured via environment variable if it can vary.
 * Users can also specify a different Pod contract address when calling the action.
 */
export const DEFAULT_POD_NFT_CONTRACT_ADDRESS = 'YOUR_DEFAULT_POD_NFT_CONTRACT_ADDRESS_HERE'; // Placeholder 