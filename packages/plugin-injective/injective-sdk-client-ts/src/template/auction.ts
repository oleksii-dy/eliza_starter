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

export const msgBidRequestTemplate = `
Extract burn auction bid request parameters:
- Amount: {{amount}} (string) - The amount to bid in the auction
- Round: {{round}} (number) - The auction round number
`;