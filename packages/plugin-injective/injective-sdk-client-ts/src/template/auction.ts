// Auction Module Templates

export const getAuctionModuleParamsTemplate = `
### Get Auction Module Parameters

**Description**:
This query retrieves the current parameters of the Auction module. The Auction module manages the auctioning process of baskets, including bidding, round management, and overall auction configurations. Understanding these parameters is essential for monitoring auction behaviors, setting auction rules, and ensuring the smooth operation of the auction system within the blockchain ecosystem.

**Request Format**:
\`\`\`json
{}
\`\`\`

**Example Request**:
\`\`\`json
{}
\`\`\`

**Response Format**:
\`\`\`json
{
    "height": number,
    "txHash": string,               // Empty string for queries
    "codespace": string,
    "code": number,
    "data": string,                 // Optional: Base64 encoded data containing auction module parameters
    "rawLog": string,
    "logs": [],                     // Optional
    "info": string,                 // Optional
    "gasWanted": number,
    "gasUsed": number,
    "timestamp": string,
    "events": []                    // Optional
}
\`\`\`

**Example Response**:
\`\`\`json
{
    "height": 124400,
    "txHash": "",
    "codespace": "",
    "code": 0,
    "data": "Cg9hdWN0aW9uX21vZHVsZV9wYXJhbXMA",
    "rawLog": "[{\"events\": [{\"type\": \"get_auction_module_params\", \"attributes\": []}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 70000,
    "gasUsed": 50000,
    "timestamp": "2025-09-20T10:00:00Z",
    "events": []
}
\`\`\`
`;

export const getAuctionModuleStateTemplate = `
### Get Auction Module State

**Description**:
This query retrieves the current state of the Auction module. The Auction module state includes information about ongoing auctions, active rounds, and the status of auction baskets. Monitoring the module state is crucial for understanding the current auction landscape, tracking progress, and making informed decisions based on real-time auction data.

**Request Format**:
\`\`\`json
{}
\`\`\`

**Example Request**:
\`\`\`json
{}
\`\`\`

**Response Format**:
\`\`\`json
{
    "height": number,
    "txHash": string,               // Empty string for queries
    "codespace": string,
    "code": number,
    "data": string,                 // Optional: Base64 encoded data containing auction module state
    "rawLog": string,
    "logs": [],                     // Optional
    "info": string,                 // Optional
    "gasWanted": number,
    "gasUsed": number,
    "timestamp": string,
    "events": []                    // Optional
}
\`\`\`

**Example Response**:
\`\`\`json
{
    "height": 124401,
    "txHash": "",
    "codespace": "",
    "code": 0,
    "data": "Cg5hdWN0aW9uX21vZHVsZV9zdGF0ZQAA",
    "rawLog": "[{\"events\": [{\"type\": \"get_auction_module_state\", \"attributes\": []}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 75000,
    "gasUsed": 55000,
    "timestamp": "2025-09-21T11:15:30Z",
    "events": []
}
\`\`\`
`;

export const getCurrentBasketTemplate = `
### Get Current Auction Basket

**Description**:
This query retrieves the details of the current auction basket within the Auction module. The auction basket contains the items or assets being auctioned, along with relevant metadata such as total bids, reserve prices, and auction duration. Monitoring the current basket is essential for bidders to understand what is up for auction, track bidding progress, and make strategic bidding decisions.

**Request Format**:
\`\`\`json
{}
\`\`\`

**Example Request**:
\`\`\`json
{}
\`\`\`

**Response Format**:
\`\`\`json
{
    "height": number,
    "txHash": string,               // Empty string for queries
    "codespace": string,
    "code": number,
    "data": string,                 // Optional: Base64 encoded data containing current basket details
    "rawLog": string,
    "logs": [],                     // Optional
    "info": string,                 // Optional
    "gasWanted": number,
    "gasUsed": number,
    "timestamp": string,
    "events": []                    // Optional
}
\`\`\`

**Example Response**:
\`\`\`json
{
    "height": 124402,
    "txHash": "",
    "codespace": "",
    "code": 0,
    "data": "Cg5jdXJyZW50X2Jhc2tldAA=",
    "rawLog": "[{\"events\": [{\"type\": \"get_current_basket\", \"attributes\": []}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 80000,
    "gasUsed": 60000,
    "timestamp": "2025-09-22T12:20:40Z",
    "events": []
}
\`\`\`
`;

export const getAuctionRoundTemplate = `
### Get Auction Round Details

**Description**:
This query retrieves the details of a specific auction round within the Auction module. Each auction round represents a distinct bidding period where participants can place bids on the auction basket. Monitoring auction round details is essential for tracking bidding activity, understanding bid distributions, and evaluating the competitiveness of each round.

**Request Format**:
\`\`\`json
{
    "round": number   // Auction round number (e.g., 1, 2, 3)
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "round": 1
}
\`\`\`

**Response Format**:
\`\`\`json
{
    "height": number,
    "txHash": string,               // Empty string for queries
    "codespace": string,
    "code": number,
    "data": string,                 // Optional: Base64 encoded data containing auction round details
    "rawLog": string,
    "logs": [],                     // Optional
    "info": string,                 // Optional
    "gasWanted": number,
    "gasUsed": number,
    "timestamp": string,
    "events": []                    // Optional
}
\`\`\`

**Example Response**:
\`\`\`json
{
    "height": 124403,
    "txHash": "",
    "codespace": "",
    "code": 0,
    "data": "CgdkYXVjdGlvblJvdW5kAA==",
    "rawLog": "[{\"events\": [{\"type\": \"get_auction_round\", \"attributes\": [{\"key\": \"round\", \"value\": \"1\"}]}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 85000,
    "gasUsed": 65000,
    "timestamp": "2025-09-23T13:25:50Z",
    "events": []
}
\`\`\`
`;

export const getAuctionsTemplate = `
### Get Auctions

**Description**:
This query retrieves a list of all auctions based on the provided parameters within the Auction module. Fetching a list of auctions allows participants to view ongoing, upcoming, and past auctions, facilitating informed participation and analysis of auction trends. Monitoring auctions helps in understanding market dynamics, assessing asset valuations, and strategizing bidding behaviors.

**Request Format**:
\`\`\`json
{
    "filter": {
        "status": string,                 // (Optional) Status of the auction (e.g., "ongoing", "completed")
        "round": number,                  // (Optional) Specific auction round to filter
        "denom": string                   // (Optional) Denomination of the auctioned asset (e.g., "uatom")
    },
    "pagination": {
        "limit": number,                  // (Optional) Number of auctions to retrieve
        "offset": number                  // (Optional) Starting point for retrieval
    }
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "filter": {
        "status": "ongoing",
        "denom": "uatom"
    },
    "pagination": {
        "limit": 10,
        "offset": 0
    }
}
\`\`\`

**Response Format**:
\`\`\`json
{
    "height": number,
    "txHash": string,               // Empty string for queries
    "codespace": string,
    "code": number,
    "data": string,                 // Optional: Base64 encoded data containing list of auctions
    "rawLog": string,
    "logs": [],                     // Optional
    "info": string,                 // Optional
    "gasWanted": number,
    "gasUsed": number,
    "timestamp": string,
    "events": []                    // Optional
}
\`\`\`

**Example Response**:
\`\`\`json
{
    "height": 124404,
    "txHash": "",
    "codespace": "",
    "code": 0,
    "data": "W3siYXVjdGlvblN0YXR1cyI6ICJvbmdvaW5nIiwgImRlbm9tYiI6ICJ1YXRvbSJ9LCB7ImF1Y3Rpb25TdGF0dXMiOiAiY29tcGxldGVkIiwgImRlbm9tYiI6ICJ1YXRvbSJ9XQ==",
    "rawLog": "[{\"events\": [{\"type\": \"get_auctions\", \"attributes\": []}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 90000,
    "gasUsed": 70000,
    "timestamp": "2025-09-24T14:30:00Z",
    "events": []
}
\`\`\`
`;

export const msgBidTemplate = `
### Place Bid

**Description**:
This message broadcasts a transaction to place a bid in a specific auction round within the Auction module. Placing a bid allows participants to compete for the auctioned basket by offering a certain amount of tokens. Successfully placing a bid updates the bid records, reflecting the participant's commitment to acquire the auctioned assets. Monitoring bids is essential for understanding market participation, assessing bid competitiveness, and strategizing future bidding behaviors.

**Request Format**:
\`\`\`json
{
    "round": number,                         // Auction round number to bid in (e.g., 1, 2, 3)
    "amount": string                         // Amount to bid (e.g., "1000") in INJ_DENOM
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "round": 1,
    "amount": "1000"
}
\`\`\`

**Response Format**:
\`\`\`json
{
    "height": number,
    "txHash": string,                       // Transaction hash
    "codespace": string,
    "code": number,
    "data": string,                         // Optional: Base64 encoded data containing transaction details
    "rawLog": string,
    "logs": [],                             // Optional
    "info": string,                         // Optional
    "gasWanted": number,
    "gasUsed": number,
    "timestamp": string,
    "events": []                            // Optional
}
\`\`\`

**Example Response**:
\`\`\`json
{
    "height": 124405,
    "txHash": "XYZ789bidsuccessxyz...",
    "codespace": "",
    "code": 0,
    "data": "CgpidWlkAA==",
    "rawLog": "[{\"events\": [{\"type\": \"bid\", \"attributes\": [{\"key\": \"round\", \"value\": \"1\"}, {\"key\": \"injective_address\", \"value\": \"inj1sender123...\"}, {\"key\": \"amount\", \"value\": \"1000INJ\"}]}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 150000,
    "gasUsed": 120000,
    "timestamp": "2025-09-25T15:35:10Z",
    "events": []
}
\`\`\`
`;
