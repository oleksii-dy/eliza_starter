// Bank Module Templates

export const getBankModuleParamsTemplate = `
### Get Bank Module Parameters

**Description**:
This query retrieves the current parameters of the Bank module. The Bank module is responsible for managing token transfers, maintaining account balances, and handling denominations within the blockchain ecosystem. Understanding these parameters is essential for monitoring token policies, transaction fees, and overall financial operations within the network.

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
    "data": string,                   // Optional: Base64 encoded data containing bank module parameters
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
    "height": 124100,
    "txHash": "ABC123bankparamsxyz...",
    "codespace": "",
    "code": 0,
    "data": "Cg1iYW5rX21vZHVsZV9wYXJhbXMAA==",
    "rawLog": "[{\"events\": [{\"type\": \"get_bank_module_params\", \"attributes\": []}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 80000,
    "gasUsed": 60000,
    "timestamp": "2025-09-01T10:00:00Z",
    "events": []
}
\`\`\`
`;

export const getBankBalanceTemplate = `
### Get Bank Balance

**Description**:
This query retrieves the balance of a specific account within the Bank module. Monitoring account balances is crucial for managing funds, ensuring sufficient liquidity, and tracking financial activities of users on the blockchain. Understanding individual account balances helps in auditing, financial reporting, and user account management.

**Request Format**:
\`\`\`json
{
    "accountAddress": string   // Address of the account (e.g., "inj1account123...")
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "accountAddress": "inj1account123..."
}
\`\`\`

**Response Format**:
\`\`\`json
{
    "height": number,
    "txHash": string,
    "codespace": string,
    "code": number,
    "data": string,                   // Optional: Base64 encoded data containing account balance details
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
    "height": 124101,
    "txHash": "DEF456bankbalancexyz...",
    "codespace": "",
    "code": 0,
    "data": "CgdkZWxhZ2VfYWNjb3VudAA=",
    "rawLog": "[{\"events\": [{\"type\": \"get_bank_balance\", \"attributes\": [{\"key\": \"account_address\", \"value\": \"inj1account123...\"}]}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 90000,
    "gasUsed": 70000,
    "timestamp": "2025-09-02T11:15:30Z",
    "events": []
}
\`\`\`
`;

export const getBankBalancesTemplate = `
### Get Bank Balances

**Description**:
This query retrieves all balances for the current account within the Bank module. Monitoring all account balances provides a comprehensive view of a user's holdings, facilitating better financial management, auditing, and liquidity assessment. Understanding the full spectrum of an account's balances is essential for effective financial operations and user experience.

**Request Format**:
\`\`\`json
{
    "accountIdentifier": string   // Identifier of the account (e.g., "inj1account123...")
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "accountIdentifier": "inj1account123..."
}
\`\`\`

**Response Format**:
\`\`\`json
{
    "height": number,
    "txHash": string,
    "codespace": string,
    "code": number,
    "data": string,                   // Optional: Base64 encoded data containing all account balances
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
    "height": 124102,
    "txHash": "GHI789getbankbalancesxyz...",
    "codespace": "",
    "code": 0,
    "data": "W3siYW1vdW50IjogIjEwMDAwIiwgImRlbm9tYiI6ICJ1YXRvbSJ9LCB7ImFtb3VudCI6ICIyMDAwMCIsICJkZW5vbWIiOiAiZGV0aGVybSJ9XQ==",
    "rawLog": "[{\"events\": [{\"type\": \"get_bank_balances\", \"attributes\": [{\"key\": \"account_identifier\", \"value\": \"inj1account123...\"}]}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 100000,
    "gasUsed": 80000,
    "timestamp": "2025-09-03T12:20:40Z",
    "events": []
}
\`\`\`
`;

export const getTotalSupplyTemplate = `
### Get Total Supply

**Description**:
This query retrieves the total supply of all denominations within the Bank module. Monitoring the total supply is essential for understanding the tokenomics of the blockchain, tracking inflation or deflation trends, and ensuring the integrity of the token supply. Understanding total supply helps in economic analysis and strategic planning for the network.

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
    "data": string,                   // Optional: Base64 encoded data containing total supply details
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
    "height": 124103,
    "txHash": "JKL012totalsupplyxyz...",
    "codespace": "",
    "code": 0,
    "data": "Cg10b3RhbHN1cHBseQAA==",
    "rawLog": "[{\"events\": [{\"type\": \"get_total_supply\", \"attributes\": []}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 85000,
    "gasUsed": 65000,
    "timestamp": "2025-09-04T13:25:50Z",
    "events": []
}
\`\`\`
`;

export const getAllTotalSupplyTemplate = `
### Get All Total Supply

**Description**:
This query retrieves the total supply for all denominations within the Bank module. Monitoring the total supply across all denominations provides a detailed overview of the token distribution, aiding in economic analysis, supply chain management, and financial auditing. Understanding the total supply of each denomination helps in assessing the network's economic health and stability.

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
    "data": string,                   // Optional: Base64 encoded data containing all total supply details
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
    "height": 124104,
    "txHash": "MNO345getalltotalsupplyxyz...",
    "codespace": "",
    "code": 0,
    "data": "W3sidG9rZW5VcmwiOiAidWF0b20iLCAiZmFjdG9yIjogIjEwMDAwMCJ9LCB7InRva2VuVXJsIjogImRldGhlcm0iLCAiZmFjdG9yIjogIjIwMDAwMCJ9XQ==",
    "rawLog": "[{\"events\": [{\"type\": \"get_all_total_supply\", \"attributes\": []}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 90000,
    "gasUsed": 70000,
    "timestamp": "2025-09-05T14:30:00Z",
    "events": []
}
\`\`\`
`;

export const getSupplyOfTemplate = `
### Get Supply Of

**Description**:
This query retrieves the supply of a specific denomination within the Bank module. Monitoring the supply of individual denominations is crucial for tracking token distribution, managing inflation rates, and ensuring the scarcity or abundance of specific tokens. Understanding the supply of each denomination aids in economic planning and strategic decision-making within the network.

**Request Format**:
\`\`\`json
{
    "denom": string   // Denomination to query (e.g., "uatom")
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "denom": "uatom"
}
\`\`\`

**Response Format**:
\`\`\`json
{
    "height": number,
    "txHash": string,
    "codespace": string,
    "code": number,
    "data": string,                   // Optional: Base64 encoded data containing supply details of the denomination
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
    "height": 124105,
    "txHash": "PQR678getsupplyofxyz...",
    "codespace": "",
    "code": 0,
    "data": "CgdkZXN1cHBseU9mAA==",
    "rawLog": "[{\"events\": [{\"type\": \"get_supply_of\", \"attributes\": [{\"key\": \"denom\", \"value\": \"uatom\"}]}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 95000,
    "gasUsed": 75000,
    "timestamp": "2025-09-06T15:35:10Z",
    "events": []
}
\`\`\`
`;

export const getDenomsMetadataTemplate = `
### Get Denominations Metadata

**Description**:
This query retrieves metadata for all denominations within the Bank module. Denomination metadata includes information such as display names, symbols, decimal places, and description of each token. Monitoring denomination metadata is essential for user interfaces, wallets, and applications to accurately represent and handle different tokens within the ecosystem.

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
    "data": string,                   // Optional: Base64 encoded data containing metadata for all denominations
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
    "height": 124106,
    "txHash": "STU901getdenomsmetadataxyz...",
    "codespace": "",
    "code": 0,
    "data": "W3siZGVub21iIjogInVhdG9tIiwgImRpc3BsYXkiOiAiVUFUT00iLCAiZGVjaW1hbCI6IDEwLCAiZGVzY3JpcHRpb24iOiAiQXV0b20gdG9rZW4iIH1d",
    "rawLog": "[{\"events\": [{\"type\": \"get_denoms_metadata\", \"attributes\": []}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 100000,
    "gasUsed": 80000,
    "timestamp": "2025-09-07T16:40:20Z",
    "events": []
}
\`\`\`
`;

export const getDenomMetadataTemplate = `
### Get Denomination Metadata

**Description**:
This query retrieves metadata for a specific denomination within the Bank module. Denomination metadata includes information such as display names, symbols, decimal places, and description of the token. Monitoring denomination metadata is essential for user interfaces, wallets, and applications to accurately represent and handle different tokens within the ecosystem.

**Request Format**:
\`\`\`json
{
    "denom": string   // Denomination to query (e.g., "uatom")
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "denom": "uatom"
}
\`\`\`

**Response Format**:
\`\`\`json
{
    "height": number,
    "txHash": string,
    "codespace": string,
    "code": number,
    "data": string,                   // Optional: Base64 encoded data containing metadata of the denomination
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
    "height": 124107,
    "txHash": "UVW234getdenommetadataxyz...",
    "codespace": "",
    "code": 0,
    "data": "Cg5kZW5vbU1ldGFkYXRhAA==",
    "rawLog": "[{\"events\": [{\"type\": \"get_denom_metadata\", \"attributes\": [{\"key\": \"denom\", \"value\": \"uatom\"}]}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 90000,
    "gasUsed": 70000,
    "timestamp": "2025-09-08T17:45:30Z",
    "events": []
}
\`\`\`
`;

export const getDenomOwnersTemplate = `
### Get Denomination Owners

**Description**:
This query retrieves the owners of a specific denomination within the Bank module. Denomination owners are accounts that hold balances of a particular token. Monitoring denomination owners is essential for understanding token distribution, tracking major holders, and analyzing the decentralization of token holdings within the network.

**Request Format**:
\`\`\`json
{
    "denom": string   // Denomination to query (e.g., "uatom")
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "denom": "uatom"
}
\`\`\`

**Response Format**:
\`\`\`json
{
    "height": number,
    "txHash": string,
    "codespace": string,
    "code": number,
    "data": string,                   // Optional: Base64 encoded data containing list of denomination owners
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
    "height": 124108,
    "txHash": "BCD567getdenomownersxyz...",
    "codespace": "",
    "code": 0,
    "data": "W3siYWNjb3VudEFkZHJlc3MiOiAiaW5qMWFjY291bnQxMjMiLCAiYW1vdW50IjogIjUwMDAifSwgeyJhY2NvdW50QWRkcmVzcyI6ICJpbmphY2NvdW50NDU2IiwgImFtb3VudCI6ICIxMDAwMCJ9XQ==",
    "rawLog": "[{\"events\": [{\"type\": \"get_denom_owners\", \"attributes\": [{\"key\": \"denom\", \"value\": \"uatom\"}]}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 105000,
    "gasUsed": 85000,
    "timestamp": "2025-09-09T18:50:40Z",
    "events": []
}
\`\`\`
`;

export const msgSendTemplate = `
### Send Tokens

**Description**:
This message broadcasts a transaction to send tokens from one account to another within the Bank module. Sending tokens is a fundamental operation for transferring assets, enabling commerce, and facilitating interactions between users on the blockchain. Successfully sending tokens updates the sender's and receiver's balances accordingly.

**Request Format**:
\`\`\`json
{
    "srcInjectiveAddress": string,        // Address of the sender (e.g., "inj1sender123...")
    "dstInjectiveAddress": string,        // Address of the receiver (e.g., "inj1receiver456...")
    "amount": [
        {
            "denom": string,                // Denomination of the token (e.g., "uatom")
            "amount": string                // Amount of tokens to send (e.g., "1000")
        }
    ]
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "srcInjectiveAddress": "inj1sender123...",
    "dstInjectiveAddress": "inj1receiver456...",
    "amount": [
        {
            "denom": "uatom",
            "amount": "1000"
        },
        {
            "denom": "udvpn",
            "amount": "500"
        }
    ]
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
    "height": 124109,
    "txHash": "EFG789sendsuccessxyz...",
    "codespace": "",
    "code": 0,
    "data": "CgZzZW5kAA==",
    "rawLog": "[{\"events\": [{\"type\": \"send\", \"attributes\": [{\"key\": \"sender\", \"value\": \"inj1sender123...\"}, {\"key\": \"receiver\", \"value\": \"inj1receiver456...\"}, {\"key\": \"amount\", \"value\": \"1000uatom\"}, {\"key\": \"amount\", \"value\": \"500udvpn\"}]}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 200000,
    "gasUsed": 150000,
    "timestamp": "2025-09-10T19:55:50Z",
    "events": []
}
\`\`\`
`;

export const msgMultiSendTemplate = `
### Multi Send Tokens

**Description**:
This message broadcasts a transaction to send tokens from multiple senders to multiple receivers within the Bank module. MultiSend operations are useful for batch transactions, airdrops, and distributing tokens to multiple recipients efficiently. Successfully executing a MultiSend updates the balances of all involved accounts accordingly.

**Request Format**:
\`\`\`json
{
    "inputs": [
        {
            "address": string,             // Address of the sender (e.g., "inj1sender123...")
            "coins": [
                {
                    "denom": string,        // Denomination of the token (e.g., "uatom")
                    "amount": string        // Amount of tokens to send (e.g., "1000")
                }
            ]
        }
    ],
    "outputs": [
        {
            "address": string,             // Address of the receiver (e.g., "inj1receiver456...")
            "coins": [
                {
                    "denom": string,        // Denomination of the token (e.g., "uatom")
                    "amount": string        // Amount of tokens to receive (e.g., "500")
                }
            ]
        }
    ]
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "inputs": [
        {
            "address": "inj1sender123...",
            "coins": [
                {
                    "denom": "uatom",
                    "amount": "1000"
                },
                {
                    "denom": "udvpn",
                    "amount": "500"
                }
            ]
        },
        {
            "address": "inj2sender456...",
            "coins": [
                {
                    "denom": "uatom",
                    "amount": "2000"
                }
            ]
        }
    ],
    "outputs": [
        {
            "address": "inj1receiver789...",
            "coins": [
                {
                    "denom": "uatom",
                    "amount": "1500"
                }
            ]
        },
        {
            "address": "inj2receiver012...",
            "coins": [
                {
                    "denom": "udvpn",
                    "amount": "500"
                },
                {
                    "denom": "uatom",
                    "amount": "500"
                }
            ]
        }
    ]
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
    "height": 124110,
    "txHash": "XYZ012multisendsuccessxyz...",
    "codespace": "",
    "code": 0,
    "data": "Cg1tdWx0aVNlbmQAA==",
    "rawLog": "[{\"events\": [{\"type\": \"multi_send\", \"attributes\": [{\"key\": \"inputs\", \"value\": \"inj1sender123..., inj2sender456...\"}, {\"key\": \"outputs\", \"value\": \"inj1receiver789..., inj2receiver012...\"}]}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 250000,
    "gasUsed": 200000,
    "timestamp": "2025-09-11T20:00:00Z",
    "events": []
}
\`\`\`
`;
