export const convertNftToAliAgentTemplate = `You are an AI assistant. Your task is to extract parameters for converting an NFT into an ALI Agent.\n\nReview the recent messages:\n<recent_messages>\n{{recentMessages}}\n</recent_messages>\n\nBased on the conversation, identify:\n- nftContract: The NFT contract address (required, string starting with 0x)\n- tokenId: The NFT token ID to convert (required, string representing the token ID)\n- recipient: The address that will own the new ALI Agent (optional, string starting with 0x)\n- implementationType: The implementation type - 0 for ETH, 1 for ALI (optional, defaults to 1)\n\nLook for:\n- Contract addresses (0x followed by 40 hex characters)\n- Token IDs (numeric values, can be quoted strings)\n- Recipient addresses if specified\n- Keywords like \"ETH implementation\" or \"ALI Agent\" for implementation type\n\nOutput only a JSON object with the parameters (nftContract, tokenId, recipient, implementationType) or {\"error\": \"reason\"}.\n`;

export const convertInftToAliAgentTemplate = `You are an AI assistant. Your task is to extract parameters for converting an iNFT into an ALI Agent.\n\nReview the recent messages:\n<recent_messages>\n{{recentMessages}}\n</recent_messages>\n\nBased on the conversation, identify:\n- inftContract: The iNFT contract address (required, string starting with 0x)\n- inftTokenId: The iNFT token ID to convert (required, string representing the token ID)\n- recipient: The address that will own the new ALI Agent (optional, string starting with 0x)\n\nLook for:\n- Contract addresses (0x followed by 40 hex characters) specifically mentioned as iNFT contracts.\n- Token IDs (numeric values, can be quoted strings) associated with iNFTs.\n- Recipient addresses if specified.\n\nOutput only a JSON object with the parameters (inftContract, inftTokenId, recipient) or {\"error\": \"reason\"}.\n`;

export const buyKeysTemplate = `You are an AI assistant. Your task is to extract parameters for buying keys for an ALI Agent.

Review the recent messages:
<recent_messages>
{{recentMessages}}
</recent_messages>

Based on the conversation, identify:
- agentId: The ALI Agent ID in format "nftContract:tokenId" (required, string like "0x303d1e1f43fef1fb8eab940d9c11a203281c5211:7")
- amount: The number of keys to purchase (required, string representing a number)

Look for:
- ALI Agent IDs in the format "nftContract:tokenId" where nftContract is a 42-character hex address starting with 0x and tokenId is a number
- Examples: "0x303d1e1f43fef1fb8eab940d9c11a203281c5211:7" or "0x739e9b04d8dcd08394c0ef0372333957661712f9:42"
- Number of keys to buy (numeric values)
- Keywords like "buy keys", "purchase keys", "ALI agent"

Output only a JSON object with the parameters (agentId, amount) or {"error": "reason"}.
`;

export const sellKeysTemplate = `You are an AI assistant. Your task is to extract parameters for selling keys for an ALI Agent.

Review the recent messages:
<recent_messages>
{{recentMessages}}
</recent_messages>

Based on the conversation, identify:
- agentId: The ALI Agent ID in format "nftContract:tokenId" (required, string like "0x303d1e1f43fef1fb8eab940d9c11a203281c5211:7")
- amount: The number of keys to sell (required, string representing a number)

Look for:
- ALI Agent IDs in the format "nftContract:tokenId" where nftContract is a 42-character hex address starting with 0x and tokenId is a number
- Examples: "0x303d1e1f43fef1fb8eab940d9c11a203281c5211:7" or "0x739e9b04d8dcd08394c0ef0372333957661712f9:42"
- Number of keys to sell (numeric values)
- Keywords like "sell keys", "ALI agent"

Output only a JSON object with the parameters (agentId, amount) or {"error": "reason"}.
`;

export const getAliAgentKeyBuyPriceTemplate = `You are an AI assistant. Your task is to extract parameters for getting the buy price of keys for an ALI Agent.

Review the recent messages:
<recent_messages>
{{recentMessages}}
</recent_messages>

Based on the conversation, identify:
- agentId: The ALI Agent ID in format "nftContract:tokenId" (required, string like "0x303d1e1f43fef1fb8eab940d9c11a203281c5211:7")
- amount: The number of keys for which to fetch the buy price (required, string representing a number, defaults to "1" if not specified)

Look for:
- ALI Agent IDs in the format "nftContract:tokenId" where nftContract is a 42-character hex address starting with 0x and tokenId is a number
- Examples: "0x303d1e1f43fef1fb8eab940d9c11a203281c5211:7" or "0x739e9b04d8dcd08394c0ef0372333957661712f9:42"
- Number of keys for price check (numeric values, defaults to 1)
- Keywords like "price", "buy price", "cost", "ALI agent"

Output only a JSON object with the parameters (agentId, amount) or {"error": "reason"}.
`;

export const getAliAgentKeySellPriceTemplate = `You are an AI assistant. Your task is to extract parameters for getting the sell price of keys for an ALI Agent.

Review the recent messages:
<recent_messages>
{{recentMessages}}
</recent_messages>

Based on the conversation, identify:
- agentId: The ALI Agent ID in format "nftContract:tokenId" (required, string like "0x303d1e1f43fef1fb8eab940d9c11a203281c5211:7")
- amount: The number of keys for which to fetch the sell price (required, string representing a number, defaults to "1" if not specified)

Look for:
- ALI Agent IDs in the format "nftContract:tokenId" where nftContract is a 42-character hex address starting with 0x and tokenId is a number
- Examples: "0x303d1e1f43fef1fb8eab940d9c11a203281c5211:7" or "0x739e9b04d8dcd08394c0ef0372333957661712f9:42"
- Number of keys for price check (numeric values, defaults to 1)
- Keywords like "price", "sell price", "value", "ALI agent"

Output only a JSON object with the parameters (agentId, amount) or {"error": "reason"}.
`;

export const fusePodWithAliAgentTemplate = `You are an AI assistant. Your task is to extract parameters for fusing a Level 5 Pod NFT with an ALI Agent.\n\nReview the recent messages:\n<recent_messages>\n{{recentMessages}}\n</recent_messages>\n\nBased on the conversation, identify:\n- agentId: The ALI Agent ID (contract address) to fuse the Pod with (required, string starting with 0x)\n- podId: The Token ID of the Level 5 Pod NFT to be fused (required, string representing a number)\n- podContractAddress: The contract address of the Pod NFT (optional, string starting with 0x, if specified by user; otherwise, an environment variable or default might be used by the system if applicable for Pods).\n\nLook for:\n- ALI Agent contract addresses (0x...)\n- Pod NFT Token IDs (numeric values, can be quoted strings)\n- Pod NFT contract addresses if explicitly mentioned (0x...)\n\nOutput only a JSON object with the parameters (agentId, podId, podContractAddress) or {\"error\": \"reason\"}.\n`;

export const distributeHiveTokensTemplate = `You are an AI assistant. Your task is to extract parameters for distributing Hive utility tokens via airdrop.

Review the recent messages:
<recent_messages>
{{recentMessages}}
</recent_messages>

Use the lastest message as the recent messages.

Based on the conversation, identify:
- hiveId: The Hive ID (required, string)
- tokenContract: The utility token contract address (required, string starting with 0x)
- recipients: Array of recipient addresses (required, array of strings starting with 0x)
- amounts: Array of amounts in tokens corresponding to each recipient (required, array of strings representing numbers)

Look for:
- Hive IDs (numeric or string identifiers)
- Phrases like "from Hive", "using Hive", "Hive token airdrop" 
- Token contract addresses (0x followed by 40 hex characters)
- Lists of recipient addresses
- Corresponding amounts for each recipient
- Keywords like "airdrop", "distribute", "send tokens"

IMPORTANT: This action MUST be used when distributing tokens FROM a Hive. If the user explicitly mentions a Hive ID or "from Hive", use this action instead of the generic EXECUTE_AIRDROP.

Ensure recipients.length === amounts.length.

Output only a JSON object with the parameters (hiveId, tokenContract, recipients, amounts) or {"error": "reason"}.
`;

export const createLiquidityPoolTemplate = `You are an AI assistant. Your task is to extract parameters for creating a liquidity pool for a Hive's utility token on Uniswap.

Review the recent messages:
<recent_messages>
{{recentMessages}}
</recent_messages>

Based on the conversation, identify:
- tokenA: The Hive utility token address (required, string starting with 0x)
- tokenB: The pair token address (required). This can be a symbol like "WETH" or "USDC", or a full address.
- amountA: Amount of tokenA to deposit (required, string representing a number).
- amountB: Amount of tokenB to deposit (required, string representing a number).
- feeTier: Fee tier for Uniswap v3 (optional, number like 3000, 500, 10000).

Look for:
- Token contract addresses (0x...) or token symbols (WETH, USDC).
- Amounts to deposit for each token.
- Fee tier specifications.
- Keywords like "create pool", "add liquidity", "Uniswap".

IMPORTANT:
- If the user provides a common token symbol like "WETH" or "USDC", just output the symbol. The system will handle resolving it to the correct address. For other tokens, provide the full contract address.
- If no fee tier is mentioned by the user, COMPLETELY OMIT the "feeTier" key from your JSON output. Do not include it with a null value.

Output only a JSON object with the required parameters, and feeTier only if it was specified.
`;

export const deployAliAgentTokenTemplate = `You are an AI assistant. Your task is to extract parameters for deploying an ERC-20 token for an ALI Agent.\n\nReview the recent messages:\n<recent_messages>\n{{recentMessages}}\n</recent_messages>\n\nBased on the conversation, identify:\n- agentId: The ALI Agent ID to attach the token to (required, string)\n- tokenName: The ERC-20 token name (required, string)\n- tokenSymbol: The token symbol (required, string)\n- initialSupply: The total supply for the token (required, string representing a number)\n\nLook for:\n- ALI Agent IDs or addresses\n- Token names and symbols\n- Supply amounts\n- Keywords like "deploy token", "create token", "launch token"\n\nOutput only a JSON object with the parameters (agentId, tokenName, tokenSymbol, initialSupply) or {"error": "reason"}.\n`;

export const deployHiveUtilityTokenTemplate = `You are an AI assistant. Your task is to extract parameters for deploying an ERC-20 utility token for a Hive.\n\nReview the recent messages:\n<recent_messages>\n{{recentMessages}}\n</recent_messages>\n\nBased on the conversation, identify:\n- hiveId: The Hive ID to link the token to (required, string)\n- tokenName: The ERC-20 token name (required, string)\n- tokenSymbol: The token symbol (required, string)\n- initialSupply: The total supply in wei (required, string representing a number)\n\nLook for:\n- Hive IDs (numeric or string identifiers)\n- Token names and symbols\n- Supply amounts (may need conversion to wei)\n- Keywords like "deploy utility token", "create Hive token", "launch token"\n\nOutput only a JSON object with the parameters (hiveId, tokenName, tokenSymbol, initialSupply) or {"error": "reason"}.\n`;

export const executeAirdropTemplate = `You are an AI assistant. Your task is to extract parameters for executing a generic token airdrop (not Hive-specific).

Review the recent messages:
<recent_messages>
{{recentMessages}}
</recent_messages>

Use the lastest message as the recent messages.

Based on the conversation, identify:
- tokenAddress: The ALI Agent token or Hive utility token contract address (required, string starting with 0x)
- recipients: Array of recipient addresses (required, array of strings starting with 0x)
- amounts: Array of amounts in tokens corresponding to each recipient (required, array of strings representing numbers)

Look for:
- Token contract addresses (0x followed by 40 hex characters)
- Lists of recipient addresses
- Corresponding amounts for each recipient
- Keywords like "airdrop", "distribute", "send tokens", "execute airdrop"

IMPORTANT: If the user explicitly mentions a Hive ID or uses phrases like "from Hive", "using Hive", or "Hive token airdrop", do NOT use this action. Instead, use the DISTRIBUTE_HIVE_TOKENS action.

Ensure recipients.length === amounts.length.
The tokenAddress should not be included in the recipients array.

Output only a JSON object with the parameters (tokenAddress, recipients, amounts) or {"error": "reason"}.
`;
