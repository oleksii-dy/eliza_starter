// Explorer Module Templates

export const getTxByHashTemplate = `
### Get Transaction by Hash

**Description**:
This query retrieves the details of a specific transaction using its unique hash within the Explorer module. Fetching transaction details is essential for auditing, tracking transaction statuses, and verifying the outcomes of specific actions performed on the blockchain. Understanding transaction details helps in ensuring transparency and accountability within the network.

**Request Format**:
\`\`\`json
{
    "hash": string   // Transaction hash (e.g., "ABC123xyz...")
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "hash": "ABC123xyz456..."
}
\`\`\`

**Response Format**:
\`\`\`json
{
    "height": number,
    "txHash": string,
    "codespace": string,
    "code": number,
    "data": string,                   // Optional: Base64 encoded data containing transaction details
    "rawLog": string,
    "logs": [],                       // Optional
    "info": string,                   // Optional
    "gasWanted": number,
    "gasUsed": number,
    "timestamp": string,
    "events": []                      // Optional
}
\`\`\`

**Example Response**:
\`\`\`json
{
    "height": 123900,
    "txHash": "ABC123xyz456...",
    "codespace": "",
    "code": 0,
    "data": "CgR0eHVzQ2hhbmdlAA==",
    "rawLog": "[{\"events\": [{\"type\": \"tx\", \"attributes\": [{\"key\": \"sender\", \"value\": \"inj1sender123...\"}, {\"key\": \"receiver\", \"value\": \"inj1receiver456...\"}]}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 120000,
    "gasUsed": 100000,
    "timestamp": "2025-07-01T10:00:00Z",
    "events": []
}
\`\`\`
`;

export const getAccountTxTemplate = `
### Get Account Transactions

**Description**:
This query fetches a list of transactions associated with a specific account within the Explorer module. Monitoring account transactions helps in tracking activity, auditing financial movements, and analyzing user behavior on the blockchain. Understanding an account's transaction history is crucial for security assessments and financial reporting.

**Request Format**:
\`\`\`json
{
    "accountAddress": string,          // Address of the account (e.g., "inj1account123...")
    "pagination": {
        "limit": number,                // (Optional) Number of transactions to retrieve
        "offset": number                // (Optional) Starting point for retrieval
    }
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "accountAddress": "inj1account123...",
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
    "txHash": string,
    "codespace": string,
    "code": number,
    "data": string,                   // Optional: Base64 encoded data containing list of transactions
    "rawLog": string,
    "logs": [],                       // Optional
    "info": string,                   // Optional
    "gasWanted": number,
    "gasUsed": number,
    "timestamp": string,
    "events": []                      // Optional
}
\`\`\`

**Example Response**:
\`\`\`json
{
    "height": 123901,
    "txHash": "DEF456accounttxxyz...",
    "codespace": "",
    "code": 0,
    "data": "W3sidHhVcmwiOiAiQUJDMTIzIiwgImFtb3VudCI6ICIxMDAwIn0seyJ0eFVybCI6ICJERUY0NTYiLCAiYW1vdW50IjogIjIwMDAwIn1d",
    "rawLog": "[{\"events\": [{\"type\": \"tx\", \"attributes\": []}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 130000,
    "gasUsed": 110000,
    "timestamp": "2025-07-02T11:15:30Z",
    "events": []
}
\`\`\`
`;

export const getValidatorTemplate = `
### Get Validator Details

**Description**:
This query retrieves the details of a specific validator using their address within the Explorer module. Validators play a crucial role in maintaining the network's security and integrity by validating transactions and producing new blocks. Understanding validator details is essential for assessing their performance, reliability, and contribution to the network.

**Request Format**:
\`\`\`json
{
    "address": string   // Validator's address (e.g., "injvaloper1validator123...")
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "address": "injvaloper1validator123..."
}
\`\`\`

**Response Format**:
\`\`\`json
{
    "height": number,
    "txHash": string,
    "codespace": string,
    "code": number,
    "data": string,                   // Optional: Base64 encoded data containing validator details
    "rawLog": string,
    "logs": [],                       // Optional
    "info": string,                   // Optional
    "gasWanted": number,
    "gasUsed": number,
    "timestamp": string,
    "events": []                      // Optional
}
\`\`\`

**Example Response**:
\`\`\`json
{
    "height": 123902,
    "txHash": "GHI789validatorxyz...",
    "codespace": "",
    "code": 0,
    "data": "CgdkZXZhbGlkYXRvcgA=",
    "rawLog": "[{\"events\": [{\"type\": \"get_validator\", \"attributes\": [{\"key\": \"address\", \"value\": \"injvaloper1validator123...\"}]}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 110000,
    "gasUsed": 90000,
    "timestamp": "2025-07-03T12:20:40Z",
    "events": []
}
\`\`\`
`;

export const getValidatorUptimeTemplate = `
### Get Validator Uptime

**Description**:
This query retrieves the uptime status of a specific validator using their address within the Explorer module. Validator uptime indicates the reliability and availability of a validator in consistently participating in the consensus process. Monitoring validator uptime is essential for assessing their performance and the overall health of the network.

**Request Format**:
\`\`\`json
{
    "validatorAddress": string   // Validator's address (e.g., "injvaloper1validator123...")
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "validatorAddress": "injvaloper1validator123..."
}
\`\`\`

**Response Format**:
\`\`\`json
{
    "height": number,
    "txHash": string,
    "codespace": string,
    "code": number,
    "data": string,                   // Optional: Base64 encoded data indicating validator uptime
    "rawLog": string,
    "logs": [],                       // Optional
    "info": string,                   // Optional
    "gasWanted": number,
    "gasUsed": number,
    "timestamp": string,
    "events": []                      // Optional
}
\`\`\`

**Example Response**:
\`\`\`json
{
    "height": 123903,
    "txHash": "JKL012validatoruptimexyz...",
    "codespace": "",
    "code": 0,
    "data": "Cg10eHVwZXRpbWUAA==",
    "rawLog": "[{\"events\": [{\"type\": \"get_validator_uptime\", \"attributes\": [{\"key\": \"validator_address\", \"value\": \"injvaloper1validator123...\"}]}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 100000,
    "gasUsed": 80000,
    "timestamp": "2025-07-04T13:25:50Z",
    "events": []
}
\`\`\`
`;

export const getPeggyDepositTxsTemplate = `
### Get Peggy Deposit Transactions

**Description**:
This query fetches Peggy deposit transactions based on provided parameters within the Explorer module. Peggy deposits involve transferring tokens from Ethereum to the Injective chain using the Peggy bridge, facilitating cross-chain interoperability. Monitoring Peggy deposits helps in tracking cross-chain asset movements, ensuring transparency, and managing liquidity across networks.

**Request Format**:
\`\`\`json
{
    "filter": {
        "sender": string,                      // (Optional) Address of the sender
        "receiver": string,                    // (Optional) Address of the receiver
        "denom": string,                       // (Optional) Denomination of the token (e.g., "eth")
        "minAmount": string,                   // (Optional) Minimum amount to filter
        "maxAmount": string,                   // (Optional) Maximum amount to filter
        "startDate": string,                   // (Optional) Start date in ISO8601 format
        "endDate": string                      // (Optional) End date in ISO8601 format
    },
    "pagination": {
        "limit": number,                        // (Optional) Number of transactions to retrieve
        "offset": number                        // (Optional) Starting point for retrieval
    }
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "filter": {
        "sender": "inj1sender123...",
        "denom": "eth",
        "minAmount": "1.0",
        "maxAmount": "10.0",
        "startDate": "2025-07-01T00:00:00Z",
        "endDate": "2025-07-31T23:59:59Z"
    },
    "pagination": {
        "limit": 20,
        "offset": 0
    }
}
\`\`\`

**Response Format**:
\`\`\`json
{
    "height": number,
    "txHash": string,
    "codespace": string,
    "code": number,
    "data": string,                   // Optional: Base64 encoded data containing Peggy deposit transactions
    "rawLog": string,
    "logs": [],                       // Optional
    "info": string,                   // Optional
    "gasWanted": number,
    "gasUsed": number,
    "timestamp": string,
    "events": []                      // Optional
}
\`\`\`

**Example Response**:
\`\`\`json
{
    "height": 123904,
    "txHash": "MNO345peggydedtxxyz...",
    "codespace": "",
    "code": 0,
    "data": "W3siaGVhZCI6IDEyMywgInNlbmRlciI6ICJpbmoxc2VuZGVyMTIzLi4uIiwgInJlY2VpdmVyIjogImluamFjY291bnQ0NTYiLCAiZGVub21iIjogImV0aCIsICJhbW91bnQiOiAiMS4wIn0seyJoZWFkIjogMTI0LCAic2VuZGVyIjogImluamFjY291bnQ3ODkiLCAicmVjZWl2ZXIiOiAiaW5qYWNjb3VudDc4OS4uLiIsICJkZW5vbWIiOiAiZXRoIiwgImFtb3VudCI6ICIxMC4wIn1d",
    "rawLog": "[{\"events\": [{\"type\": \"get_peggy_deposit_txs\", \"attributes\": []}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 150000,
    "gasUsed": 120000,
    "timestamp": "2025-07-05T14:30:00Z",
    "events": []
}
\`\`\`
`;

export const getPeggyWithdrawalTxsTemplate = `
### Get Peggy Withdrawal Transactions

**Description**:
This query fetches Peggy withdrawal transactions based on provided parameters within the Explorer module. Peggy withdrawals involve transferring tokens from the Injective chain back to Ethereum using the Peggy bridge, facilitating cross-chain interoperability. Monitoring Peggy withdrawals helps in tracking cross-chain asset movements, ensuring transparency, and managing liquidity across networks.

**Request Format**:
\`\`\`json
{
    "filter": {
        "sender": string,                      // (Optional) Address of the sender
        "receiver": string,                    // (Optional) Address of the receiver
        "denom": string,                       // (Optional) Denomination of the token (e.g., "inj")
        "minAmount": string,                   // (Optional) Minimum amount to filter
        "maxAmount": string,                   // (Optional) Maximum amount to filter
        "startDate": string,                   // (Optional) Start date in ISO8601 format
        "endDate": string                      // (Optional) End date in ISO8601 format
    },
    "pagination": {
        "limit": number,                        // (Optional) Number of transactions to retrieve
        "offset": number                        // (Optional) Starting point for retrieval
    }
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "filter": {
        "sender": "inj1sender123...",
        "denom": "inj",
        "minAmount": "1000",
        "maxAmount": "5000",
        "startDate": "2025-07-01T00:00:00Z",
        "endDate": "2025-07-31T23:59:59Z"
    },
    "pagination": {
        "limit": 15,
        "offset": 0
    }
}
\`\`\`

**Response Format**:
\`\`\`json
{
    "height": number,
    "txHash": string,
    "codespace": string,
    "code": number,
    "data": string,                   // Optional: Base64 encoded data containing Peggy withdrawal transactions
    "rawLog": string,
    "logs": [],                       // Optional
    "info": string,                   // Optional
    "gasWanted": number,
    "gasUsed": number,
    "timestamp": string,
    "events": []                      // Optional
}
\`\`\`

**Example Response**:
\`\`\`json
{
    "height": 123905,
    "txHash": "PQR678peggywithdrawxyz...",
    "codespace": "",
    "code": 0,
    "data": "W3siaGVhZCI6IDEyMywgInNlbmRlciI6ICJpbmoxc2VuZGVyMTIzLi4uIiwgInJlY2VpdmVyIjogImluamFjY291bnQ3ODkiLCAiZGVub21iIjogImluamgiLCAiYW1vdW50IjogIjEwMDAwIn0seyJoZWFkIjogMTI0LCAic2VuZGVyIjogImluamFjY291bnQ5MDEiLCAicmVjZWl2ZXIiOiAiaW5qY2F1bnQ5MDEiLCAiZGVub21iIjogImluamgiLCAiYW1vdW50IjogIjUwMDAwIn1d",
    "rawLog": "[{\"events\": [{\"type\": \"get_peggy_withdrawal_txs\", \"attributes\": []}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 160000,
    "gasUsed": 130000,
    "timestamp": "2025-07-06T15:35:10Z",
    "events": []
}
\`\`\`
`;

export const getBlocksTemplate = `
### Get Blocks

**Description**:
This query retrieves a list of blocks based on provided parameters within the Explorer module. Blocks are the fundamental units of the blockchain, containing a set of transactions and essential metadata. Monitoring blocks helps in tracking network activity, analyzing transaction throughput, and assessing the overall health and performance of the blockchain.

**Request Format**:
\`\`\`json
{
    "filter": {
        "height": number,                       // (Optional) Specific block height to filter
        "timestamp": string,                    // (Optional) Timestamp in ISO8601 format to filter
        "proposer": string                      // (Optional) Address of the block proposer
    },
    "pagination": {
        "limit": number,                        // (Optional) Number of blocks to retrieve
        "offset": number                        // (Optional) Starting point for retrieval
    }
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "filter": {
        "proposer": "injvaloper1proposer123...",
        "timestamp": "2025-07-01T00:00:00Z"
    },
    "pagination": {
        "limit": 5,
        "offset": 0
    }
}
\`\`\`

**Response Format**:
\`\`\`json
{
    "height": number,
    "txHash": string,
    "codespace": string,
    "code": number,
    "data": string,                   // Optional: Base64 encoded data containing list of blocks
    "rawLog": string,
    "logs": [],                       // Optional
    "info": string,                   // Optional
    "gasWanted": number,
    "gasUsed": number,
    "timestamp": string,
    "events": []                      // Optional
}
\`\`\`

**Example Response**:
\`\`\`json
{
    "height": 123906,
    "txHash": "STU901getblocksxyz...",
    "codespace": "",
    "code": 0,
    "data": "W3siaGVpZ2h0IjogMTIzOSwgImFtb3VudCI6ICIxMDAwMCIsICJwcm9wb3NhciI6ICJpbmphdmFsb3BlcjEyMyJ9LCB7ImhlaWdodCI6IDEyMzAsICJhbW91bnQiOiAiMjAwMDAwIiwgInByb3Bvc2VyIjogImluamF2YWxvcGVyNDU2In1d",
    "rawLog": "[{\"events\": [{\"type\": \"get_blocks\", \"attributes\": []}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 140000,
    "gasUsed": 110000,
    "timestamp": "2025-07-07T16:40:20Z",
    "events": []
}
\`\`\`
`;

export const getBlockTemplate = `
### Get Block Details

**Description**:
This query retrieves the details of a specific block using its ID within the Explorer module. Detailed block information includes metadata such as the block height, proposer, timestamp, and the list of transactions included in the block. Understanding block details is crucial for in-depth blockchain analysis, auditing, and verifying the sequence of events on the network.

**Request Format**:
\`\`\`json
{
    "id": number   // Block ID or height (e.g., 123900)
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "id": 123900
}
\`\`\`

**Response Format**:
\`\`\`json
{
    "height": number,
    "txHash": string,
    "codespace": string,
    "code": number,
    "data": string,                   // Optional: Base64 encoded data containing block details
    "rawLog": string,
    "logs": [],                       // Optional
    "info": string,                   // Optional
    "gasWanted": number,
    "gasUsed": number,
    "timestamp": string,
    "events": []                      // Optional
}
\`\`\`

**Example Response**:
\`\`\`json
{
    "height": 123907,
    "txHash": "UVW234getblockxyz...",
    "codespace": "",
    "code": 0,
    "data": "CgdkZXRfYmxvY2sAA==",
    "rawLog": "[{\"events\": [{\"type\": \"get_block\", \"attributes\": [{\"key\": \"id\", \"value\": \"123900\"}]}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 150000,
    "gasUsed": 120000,
    "timestamp": "2025-07-08T17:45:30Z",
    "events": []
}
\`\`\`
`;

export const getTxsTemplate = `
### Get Transactions

**Description**:
This query retrieves a list of transactions based on provided parameters within the Explorer module. Transactions are the core actions performed on the blockchain, including token transfers, smart contract executions, and governance actions. Monitoring transactions helps in tracking network activity, auditing operations, and analyzing user behavior.

**Request Format**:
\`\`\`json
{
    "filter": {
        "sender": string,                      // (Optional) Address of the transaction sender
        "receiver": string,                    // (Optional) Address of the transaction receiver
        "denom": string,                       // (Optional) Denomination of the token involved
        "minAmount": string,                   // (Optional) Minimum amount to filter
        "maxAmount": string,                   // (Optional) Maximum amount to filter
        "startDate": string,                   // (Optional) Start date in ISO8601 format
        "endDate": string,                     // (Optional) End date in ISO8601 format
        "txType": string                       // (Optional) Type of transaction (e.g., "transfer", "vote")
    },
    "pagination": {
        "limit": number,                        // (Optional) Number of transactions to retrieve
        "offset": number                        // (Optional) Starting point for retrieval
    }
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "filter": {
        "sender": "inj1sender123...",
        "denom": "inj",
        "minAmount": "100",
        "maxAmount": "1000",
        "startDate": "2025-07-01T00:00:00Z",
        "endDate": "2025-07-31T23:59:59Z",
        "txType": "transfer"
    },
    "pagination": {
        "limit": 25,
        "offset": 0
    }
}
\`\`\`

**Response Format**:
\`\`\`json
{
    "height": number,
    "txHash": string,
    "codespace": string,
    "code": number,
    "data": string,                   // Optional: Base64 encoded data containing list of transactions
    "rawLog": string,
    "logs": [],                       // Optional
    "info": string,                   // Optional
    "gasWanted": number,
    "gasUsed": number,
    "timestamp": string,
    "events": []                      // Optional
}
\`\`\`

**Example Response**:
\`\`\`json
{
    "height": 123908,
    "txHash": "BCD901gettxsxyz...",
    "codespace": "",
    "code": 0,
    "data": "W3sidHhVcmwiOiAiQkNERjkwMXh5ejEyMyIsICJhbW91bnQiOiAiMTAwIn0seyJ0eFVybCI6ICJERUY5MDJ4eXo0NTYiLCAiYW1vdW50IjogIjIwMDAifV0=",
    "rawLog": "[{\"events\": [{\"type\": \"get_txs\", \"attributes\": []}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 160000,
    "gasUsed": 130000,
    "timestamp": "2025-07-09T18:50:40Z",
    "events": []
}
\`\`\`
`;

export const getIBCTransferTxsTemplate = `
### Get IBC Transfer Transactions

**Description**:
This query fetches IBC (Inter-Blockchain Communication) transfer transactions based on provided parameters within the Explorer module. IBC transfers facilitate the movement of tokens between different blockchain networks, enabling cross-chain interoperability. Monitoring IBC transfers helps in tracking cross-chain asset movements, ensuring transparency, and managing liquidity across networks.

**Request Format**:
\`\`\`json
{
    "filter": {
        "sender": string,                      // (Optional) Address of the IBC transfer sender
        "receiver": string,                    // (Optional) Address of the IBC transfer receiver
        "sourceChannel": string,               // (Optional) IBC source channel (e.g., "transfer/channel-0")
        "destinationChannel": string,          // (Optional) IBC destination channel on the target chain
        "denom": string,                       // (Optional) Denomination of the token (e.g., "uatom")
        "minAmount": string,                   // (Optional) Minimum amount to filter
        "maxAmount": string,                   // (Optional) Maximum amount to filter
        "startDate": string,                   // (Optional) Start date in ISO8601 format
        "endDate": string                      // (Optional) End date in ISO8601 format
    },
    "pagination": {
        "limit": number,                        // (Optional) Number of transactions to retrieve
        "offset": number                        // (Optional) Starting point for retrieval
    }
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "filter": {
        "sender": "inj1sender123...",
        "denom": "uatom",
        "minAmount": "10",
        "maxAmount": "1000",
        "startDate": "2025-07-01T00:00:00Z",
        "endDate": "2025-07-31T23:59:59Z",
        "sourceChannel": "transfer/channel-0",
        "destinationChannel": "transfer/channel-1"
    },
    "pagination": {
        "limit": 20,
        "offset": 0
    }
}
\`\`\`

**Response Format**:
\`\`\`json
{
    "height": number,
    "txHash": string,
    "codespace": string,
    "code": number,
    "data": string,                   // Optional: Base64 encoded data containing IBC transfer transactions
    "rawLog": string,
    "logs": [],                       // Optional
    "info": string,                   // Optional
    "gasWanted": number,
    "gasUsed": number,
    "timestamp": string,
    "events": []                      // Optional
}
\`\`\`

**Example Response**:
\`\`\`json
{
    "height": 123909,
    "txHash": "XYZ012ibctransferxyz...",
    "codespace": "",
    "code": 0,
    "data": "W3sidHhVcmwiOiAiWFlaMDEySWJjdHJhbnNmZXIuLi4iLCAiYW1vdW50IjogIjEwIn0seyJ0eFVybCI6ICJYWVpTMDEyRXJyb3IuLi4iLCAiYW1vdW50IjogIjEwMDAifV0=",
    "rawLog": "[{\"events\": [{\"type\": \"get_ibc_transfer_txs\", \"attributes\": []}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 170000,
    "gasUsed": 140000,
    "timestamp": "2025-07-10T19:55:50Z",
    "events": []
}
\`\`\`
`;

export const getExplorerStatsTemplate = `
### Get Explorer Statistics

**Description**:
This query retrieves overall statistics of the blockchain network within the Explorer module. Explorer statistics provide insights into network performance, including metrics like total transactions, active validators, block times, and more. Monitoring these statistics helps in assessing the network's health, scalability, and usage trends.

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
    "txHash": string,
    "codespace": string,
    "code": number,
    "data": string,                   // Optional: Base64 encoded data containing explorer statistics
    "rawLog": string,
    "logs": [],                       // Optional
    "info": string,                   // Optional
    "gasWanted": number,
    "gasUsed": number,
    "timestamp": string,
    "events": []                      // Optional
}
\`\`\`

**Example Response**:
\`\`\`json
{
    "height": 123910,
    "txHash": "ABC345getexplorerstatsxyz...",
    "codespace": "",
    "code": 0,
    "data": "Cg5leHBsb3JlclN0YXRzAA==",
    "rawLog": "[{\"events\": [{\"type\": \"get_explorer_stats\", \"attributes\": []}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 100000,
    "gasUsed": 80000,
    "timestamp": "2025-07-11T20:00:00Z",
    "events": []
}
\`\`\`
`;
