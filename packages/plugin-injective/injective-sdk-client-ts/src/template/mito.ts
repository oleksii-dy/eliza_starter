// mito-templates.ts
export const getVaultTemplate = `
Extract vault query parameters:
- Contract Address: {{contractAddress}} (string?) - Optional contract address
- Slug: {{slug}} (string?) - Optional vault slug
`;

export const getVaultsTemplate = `
Extract vaults query parameters:
- Limit: {{limit}} (number?) - Optional result limit
- Code ID: {{codeId}} (string?) - Optional code identifier
- Page Index: {{pageIndex}} (number?) - Optional page number
`;

export const getLpTokenPriceChartTemplate = `
Extract LP token price chart parameters:
- To: {{to}} (string?) - Optional end time
- From: {{from}} (string?) - Optional start time
- Vault Address: {{vaultAddress}} (string) - Address of the vault
`;

export const getTVLChartTemplate = `
Extract TVL chart parameters:
- To: {{to}} (string?) - Optional end time
- From: {{from}} (string?) - Optional start time
- Vault Address: {{vaultAddress}} (string) - Address of the vault
`;

export const getVaultsByHolderAddressTemplate = `
Extract vaults by holder parameters:
- Skip: {{skip}} (number?) - Optional number of results to skip
- Limit: {{limit}} (number?) - Optional result limit
- Holder Address: {{holderAddress}} (string) - Address of the holder
- Vault Address: {{vaultAddress}} (string?) - Optional vault address filter
`;

export const getLPHoldersTemplate = `
Extract LP holders parameters:
- Skip: {{skip}} (number?) - Optional number of results to skip
- Limit: {{limit}} (number?) - Optional result limit
- Vault Address: {{vaultAddress}} (string) - Address of the vault
- Staking Contract Address: {{stakingContractAddress}} (string) - Staking contract address
`;

export const getHolderPortfolioTemplate = `
Extract holder portfolio parameters:
- Holder Address: {{holderAddress}} (string) - Address of the holder
- Staking Contract Address: {{stakingContractAddress}} (string) - Staking contract address
`;

export const getTransferHistoryTemplate = `
Extract transfer history parameters:
- Vault: {{vault}} (string?) - Optional vault address filter
- Account: {{account}} (string?) - Optional account address filter
- Limit: {{limit}} (number?) - Optional result limit
- To Number: {{toNumber}} (number?) - Optional ending number
- From Number: {{fromNumber}} (number?) - Optional starting number
`;

export const getLeaderboardTemplate = `
Extract leaderboard parameters:
- Epoch ID: {{epochId}} (number?) - Optional epoch identifier
`;

export const getLeaderboardEpochsTemplate = `
Extract leaderboard epochs parameters:
- Limit: {{limit}} (number?) - Optional result limit
- To Epoch ID: {{toEpochId}} (number?) - Optional ending epoch ID
- From Epoch ID: {{fromEpochId}} (number?) - Optional starting epoch ID
`;

export const getStakingPoolsTemplate = `
Extract staking pools parameters:
- Staker: {{staker}} (string?) - Optional staker address
- Staking Contract Address: {{stakingContractAddress}} (string) - Staking contract address
`;

export const getStakingHistoryTemplate = `
Extract staking history parameters:
- Staker: {{staker}} (string?) - Optional staker address filter
- Limit: {{limit}} (number?) - Optional result limit
- To Number: {{toNumber}} (number?) - Optional ending number
- From Number: {{fromNumber}} (number?) - Optional starting number
`;

export const getMissionsTemplate = `
Extract missions parameters:
- Account Address: {{accountAddress}} (string) - Address to query missions for
`;

export const getMissionLeaderboardTemplate = `
Extract mission leaderboard parameters:
- User Address: {{userAddress}} (string?) - Optional user address filter
`;

export const getIDOTemplate = `
Extract IDO parameters:
- Contract Address: {{contractAddress}} (string) - IDO contract address
- Account Address: {{accountAddress}} (string?) - Optional account address
`;

export const getIDOsTemplate = `
Extract IDOs query parameters:
- Status: {{status}} (string?) - Optional status filter
- Limit: {{limit}} (number?) - Optional result limit
- To Number: {{toNumber}} (number?) - Optional ending number
- Account Address: {{accountAddress}} (string?) - Optional account filter
- Owner Address: {{ownerAddress}} (string?) - Optional owner filter
`;

export const getIDOSubscribersTemplate = `
Extract IDO subscribers parameters:
- Skip: {{skip}} (number?) - Optional number to skip
- Limit: {{limit}} (number?) - Optional result limit
- Sort By: {{sortBy}} (string?) - Optional sort field
- Contract Address: {{contractAddress}} (string) - IDO contract address
`;

export const getIDOSubscriptionTemplate = `
Extract IDO subscription parameters:
- Contract Address: {{contractAddress}} (string) - IDO contract address
- Account Address: {{accountAddress}} (string) - Subscriber account address
`;

export const getIDOActivitiesTemplate = `
Extract IDO activities parameters:
- Contract Address: {{contractAddress}} (string?) - Optional contract address filter
- Account Address: {{accountAddress}} (string?) - Optional account address filter
- Limit: {{limit}} (number?) - Optional result limit
- To Number: {{toNumber}} (string?) - Optional ending number
`;

export const getIDOWhitelistTemplate = `
Extract IDO whitelist parameters:
- Skip: {{skip}} (number?) - Optional number to skip
- Limit: {{limit}} (number?) - Optional result limit
- IDO Address: {{idoAddress}} (string) - IDO contract address
`;

export const getClaimReferencesTemplate = `
Extract claim references parameters:
- Skip: {{skip}} (number?) - Optional number to skip
- Limit: {{limit}} (number?) - Optional result limit
- IDO Address: {{idoAddress}} (string) - IDO contract address
- Account Address: {{accountAddress}} (string) - Claimer account address
`;
