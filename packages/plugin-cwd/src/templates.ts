export const getAssetTemplate = `Respond with a list of assets order by cost.
If no asset found, respond that not asset has been found.

Provide the values in the following format:
• asset_name: total_amount tokens (Cost: total_cost cost_asset)

Example request: "What's the list of assets in my wallet?"
Example response:
Here is the list of assets found in your wallet:
• bitcoin: 100 tokens (Cost: 100 usd-coin)
• ripple: 105 tokens (Cost: 50 usd-coin)
• raydium: 25.6 tokens (Cost: 20 usd-coin)

Example request: "Show my what I have in my wallet"
Example response:
Here is what I found in your wallet:
• fartcoin: 66 tokens (Cost: 100 usd-coin)
`;
