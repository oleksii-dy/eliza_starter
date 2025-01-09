// auction-templates.ts
export const bidRequestTemplate = `
Extract auction bid request parameters:
- Amount: {{amount}} (string) - The amount to bid in the auction
- Round: {{round}} (number) - The auction round number
`;

export const auctionRoundTemplate = `
Extract auction round parameters:
- Round: {{round}} (number) - The specific auction round number to query
`;

export const getAuctionsTemplate = `
Extract auctions query parameters:
- Start Round: {{startRound}} (number) - The starting round number to query from
- Limit: {{limit}} (number) - Maximum number of auction rounds to return
`;