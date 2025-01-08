// auction-templates.ts
export const bidRequestTemplate = `
Extract auction bid request parameters:
- Amount: {{amount}}
`;

export const auctionRoundTemplate = `
Extract auction round parameters:
- Round number: {{round}}
`;

export const getAuctionsTemplate = `
Extract auctions query parameters:
- Start round: {{startRound}}
- Limit: {{limit}}
`;
