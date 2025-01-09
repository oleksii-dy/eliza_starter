// Auction Module Templates
export const msgBidRequestTemplate = `
Create auction bid request with the following parameters:

Request Format:
\`\`\`json
{
    "amount": string,                    // Bid amount
    "round": number                      // Auction round number
}
\`\`\`

Example Request:
\`\`\`json
{
    "amount": "1000000000",
    "round": 5
}
\`\`\`

Response Format:
\`\`\`json
{
    "height": string,                    // Block height
    "txHash": string,                    // Transaction hash
    "bid": {
        "bidder": string,                // Bidder address
        "amount": string,                // Bid amount
        "round": number,                 // Auction round
        "timestamp": number,             // Bid timestamp
        "status": string                 // Bid status
    }
}
\`\`\`
`;

export const getAuctionRoundTemplate = `
Query specific auction round with the following parameters:

Request Format:
\`\`\`json
{
    "round": number                      // Auction round number to query
}
\`\`\`

Example Request:
\`\`\`json
{
    "round": 5
}
\`\`\`

Response Format:
\`\`\`json
{
    "round": {
        "roundNumber": number,           // Round number
        "startTime": number,             // Round start timestamp
        "endTime": number,               // Round end timestamp
        "status": string,                // Round status
        "bids": [{
            "bidder": string,            // Bidder address
            "amount": string,            // Bid amount
            "timestamp": number          // Bid timestamp
        }],
        "winningBid": {                  // Winning bid if round completed
            "bidder": string,            // Winner address
            "amount": string,            // Winning amount
            "timestamp": number          // Win timestamp
        } | null,
        "metrics": {
            "totalBids": number,         // Total number of bids
            "totalAmount": string,       // Total bid amount
            "averageBid": string,        // Average bid amount
            "minBid": string,            // Minimum bid
            "maxBid": string            // Maximum bid
        }
    }
}
\`\`\`
`;

export const getAuctionsTemplate = `
Query multiple auction rounds with the following parameters:

Request Format:
\`\`\`json
{
    "startRound": number,                // Starting round number
    "limit": number                      // Maximum number of rounds to return
}
\`\`\`

Example Request:
\`\`\`json
{
    "startRound": 1,
    "limit": 10
}
\`\`\`

Response Format:
\`\`\`json
{
    "auctions": [{
        "roundNumber": number,           // Round number
        "startTime": number,             // Round start timestamp
        "endTime": number,               // Round end timestamp
        "status": string,                // Round status
        "totalBids": number,             // Number of bids in round
        "totalAmount": string,           // Total amount bid in round
        "winningBid": {                  // Winning bid if round completed
            "bidder": string,            // Winner address
            "amount": string,            // Winning amount
            "timestamp": number          // Win timestamp
        } | null
    }],
    "pagination": {
        "nextRound": number | null,      // Next round number for pagination
        "total": number                  // Total number of rounds available
    },
    "summary": {
        "activeRound": number | null,    // Currently active round if any
        "totalRounds": number,           // Total rounds conducted
        "totalVolume": string,           // Total auction volume
        "averageWinningBid": string,     // Average winning bid amount
        "participation": {
            "uniqueBidders": number,     // Total unique bidders
            "averageBidsPerRound": number // Average bids per round
        }
    }
}
\`\`\`
`;
