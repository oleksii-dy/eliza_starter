// Bank Module Templates
export const getBankBalanceTemplate = `
Query bank balance for specific denomination with the following parameters:

Request Format:
\`\`\`json
{
    "denom": string                      // Denomination to query
}
\`\`\`

Example Request:
\`\`\`json
{
    "denom": "inj"
}
\`\`\`

Response Format:
\`\`\`json
{
    "balance": {
        "denom": string,                 // Token denomination
        "amount": string                 // Balance amount
    }
}
\`\`\`
`;

export const getBankBalancesTemplate = `
Query all bank balances with optional pagination:

Request Format:
\`\`\`json
{
    "pagination": {                      // Optional pagination parameters
        "limit": number | null,          // Number of items per page
        "key": string | null,            // Pagination key
        "reverse": boolean | null        // Reverse order flag
    }
}
\`\`\`

Example Request:
\`\`\`json
{
    "pagination": {
        "limit": 10
    }
}
\`\`\`

Response Format:
\`\`\`json
{
    "balances": [{
        "denom": string,                 // Token denomination
        "amount": string                 // Balance amount
    }],
    "pagination": {
        "next": string | null,           // Next page token
        "total": number                  // Total number of balances
    }
}
\`\`\`
`;

export const getSupplyOfTemplate = `
Query supply of specific denomination with the following parameters:

Request Format:
\`\`\`json
{
    "denom": string                      // Denomination to query
}
\`\`\`

Example Request:
\`\`\`json
{
    "denom": "inj"
}
\`\`\`

Response Format:
\`\`\`json
{
    "amount": {
        "denom": string,                 // Token denomination
        "amount": string                 // Total supply amount
    }
}
\`\`\`
`;

export const getDenomMetadataTemplate = `
Query denomination metadata with the following parameters:

Request Format:
\`\`\`json
{
    "denom": string                      // Denomination to query
}
\`\`\`

Example Request:
\`\`\`json
{
    "denom": "inj"
}
\`\`\`

Response Format:
\`\`\`json
{
    "metadata": {
        "description": string,           // Denomination description
        "denomUnits": [{                 // Denomination units
            "denom": string,             // Unit name
            "exponent": number,          // Exponent value
            "aliases": string[]          // Alternative names
        }],
        "base": string,                  // Base denomination
        "display": string,               // Display denomination
        "name": string,                  // Token name
        "symbol": string                 // Token symbol
    }
}
\`\`\`
`;

export const getDenomOwnersTemplate = `
Query denomination owners with the following parameters:

Request Format:
\`\`\`json
{
    "denom": string                      // Denomination to query
}
\`\`\`

Example Request:
\`\`\`json
{
    "denom": "inj"
}
\`\`\`

Response Format:
\`\`\`json
{
    "denomOwners": [{
        "address": string,               // Owner address
        "balance": {                     // Balance information
            "denom": string,             // Token denomination
            "amount": string             // Balance amount
        }
    }],
    "pagination": {
        "next": string | null,           // Next page token
        "total": number                  // Total number of owners
    }
}
\`\`\`
`;

export const bankBalanceTemplate = `
Query bank balance for specific account and denomination:

Request Format:
\`\`\`json
{
    "accountAddress": string,            // Account address to query
    "denom": string                      // Denomination to query
}
\`\`\`

Example Request:
\`\`\`json
{
    "accountAddress": "inj1...",
    "denom": "inj"
}
\`\`\`

Response Format:
\`\`\`json
{
    "balance": {
        "denom": string,                 // Token denomination
        "amount": string                 // Balance amount
    }
}
\`\`\`
`;

export const msgSendTemplate = `
Send tokens with the following parameters:

Request Format:
\`\`\`json
{
    "amount": {                          // Single amount or array of amounts
        "denom": string,                 // Token denomination
        "amount": string                 // Amount to send
    } | [{
        "denom": string,                 // Token denomination
        "amount": string                 // Amount to send
    }],
    "srcInjectiveAddress": string,       // Source address
    "dstInjectiveAddress": string        // Destination address
}
\`\`\`

Example Request:
\`\`\`json
{
    "amount": {
        "denom": "inj",
        "amount": "1000000000000000000"
    },
    "srcInjectiveAddress": "inj1...",
    "dstInjectiveAddress": "inj1..."
}
\`\`\`

Response Format:
\`\`\`json
{
    "height": string,                    // Block height
    "txHash": string,                    // Transaction hash
    "transfer": {
        "sender": string,                // Sender address
        "recipient": string,             // Recipient address
        "amount": {                      // Transferred amount
            "denom": string,             // Token denomination
            "amount": string             // Amount sent
        },
        "timestamp": number            // Transfer timestamp
    }
}
\`\`\`
`;

export const msgMultiSendTemplate = `
Execute multiple sends with the following parameters:

Request Format:
\`\`\`json
{
    "inputs": [{                         // Array of input addresses and amounts
        "address": string,               // Input address
        "coins": [{                      // Array of coins to send
            "denom": string,             // Token denomination
            "amount": string             // Amount to send
        }]
    }],
    "outputs": [{                        // Array of output addresses and amounts
        "address": string,               // Output address
        "coins": [{                      // Array of coins to receive
            "denom": string,             // Token denomination
            "amount": string             // Amount to receive
        }]
    }]
}
\`\`\`

Example Request:
\`\`\`json
{
    "inputs": [{
        "address": "inj1...",
        "coins": [{
            "denom": "inj",
            "amount": "1000000000000000000"
        }]
    }],
    "outputs": [{
        "address": "inj1...",
        "coins": [{
            "denom": "inj",
            "amount": "500000000000000000"
        }],
        "address": "inj1...",
        "coins": [{
            "denom": "inj",
            "amount": "500000000000000000"
        }]
    }]
}
\`\`\`

Response Format:
\`\`\`json
{
    "height": string,                    // Block height
    "txHash": string,                    // Transaction hash
    "transfers": [{
        "sender": string,                // Sender address
        "recipient": string,             // Recipient address
        "amount": {                      // Transferred amount
            "denom": string,             // Token denomination
            "amount": string             // Amount sent
        }
    }],
    "summary": {
        "totalInputs": number,           // Total number of inputs
        "totalOutputs": number,          // Total number of outputs
        "totalAmount": {                 // Total amount transferred
            "denom": string,             // Token denomination
            "amount": string             // Total amount
        }
    },
    "timestamp": number                // Transaction timestamp
}
\`\`\`
`;

export const totalSupplyTemplate = `
Query total token supply:

Request Format:
\`\`\`json
{
    "pagination": {                      // Optional pagination parameters
        "limit": number | null,          // Number of items per page
        "key": string | null,            // Pagination key
        "reverse": boolean | null        // Reverse order flag
    }
}
\`\`\`

Example Request:
\`\`\`json
{
    "pagination": {
        "limit": 10
    }
}
\`\`\`

Response Format:
\`\`\`json
{
    "supply": [{
        "denom": string,                 // Token denomination
        "amount": string                 // Supply amount
    }],
    "pagination": {
        "next": string | null,           // Next page token
        "total": number                  // Total number of supply entries
    }
}
\`\`\`
`;