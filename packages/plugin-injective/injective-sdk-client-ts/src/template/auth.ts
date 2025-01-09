// Auth Module Templates

export const authAccountTemplate = `
Query auth account information with the following parameters:

Request Format:
\`\`\`json
{
    "accountAddress": string             // Address of the account to query
}
\`\`\`

Example Request:
\`\`\`json
{
    "accountAddress": "inj1..."
}
\`\`\`

Response Format:
\`\`\`json
{
    "account": {
        "address": string,               // Account address
        "pubKey": {                      // Public key information
            "type": string,              // Key type
            "value": string             // Key value
        } | null,
        "accountNumber": string,         // Account number
        "sequence": string,              // Account sequence
        "permissions": [{                // Account permissions
            "type": string,              // Permission type
            "value": any                // Permission value
        }]
    }
}
\`\`\`
`;

export const getGrantsTemplate = `
Query authorization grants with the following parameters:

Request Format:
\`\`\`json
{
    "granter": string,                   // Address of the granter
    "grantee": string,                   // Address of the grantee
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
    "granter": "inj1...",
    "grantee": "inj1...",
    "pagination": {
        "limit": 10
    }
}
\`\`\`

Response Format:
\`\`\`json
{
    "pagination": {
        "next": string | null,           // Next page token
        "total": number                  // Total number of grants
    },
    "grants": [{
        "granter": string,               // Granter address
        "grantee": string,               // Grantee address
        "authorization": {
            "type": string,              // Authorization type
            "value": {                   // Authorization details
                "msg": string,           // Authorized message type
                "limit": string | null   // Optional spending limit
            }
        },
        "expiration": string | null,     // Grant expiration timestamp
        "createdAt": number            // Grant creation timestamp
    }]
}
\`\`\`
`;

export const getGranterGrantsTemplate = `
Query grants given by a specific granter with the following parameters:

Request Format:
\`\`\`json
{
    "granter": string,                   // Address of the granter
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
    "granter": "inj1...",
    "pagination": {
        "limit": 20
    }
}
\`\`\`

Response Format:
\`\`\`json
{
    "pagination": {
        "next": string | null,           // Next page token
        "total": number                  // Total number of grants
    },
    "grants": [{
        "granter": string,               // Granter address
        "grantee": string,               // Grantee address
        "authorization": {
            "type": string,              // Authorization type
            "value": {                   // Authorization details
                "msg": string,           // Authorized message type
                "limit": string | null   // Optional spending limit
            }
        },
        "expiration": string | null      // Grant expiration timestamp
    }]
}
\`\`\`
`;

export const getGranteeGrantsTemplate = `
Query grants received by a specific grantee with the following parameters:

Request Format:
\`\`\`json
{
    "grantee": string,                   // Address of the grantee
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
    "grantee": "inj1...",
    "pagination": {
        "limit": 20
    }
}
\`\`\`

Response Format:
\`\`\`json
{
    "pagination": {
        "next": string | null,           // Next page token
        "total": number                  // Total number of grants
    },
    "grants": [{
        "granter": string,               // Granter address
        "grantee": string,               // Grantee address
        "authorization": {
            "type": string,              // Authorization type
            "value": {                   // Authorization details
                "msg": string,           // Authorized message type
                "limit": string | null   // Optional spending limit
            }
        },
        "expiration": string | null      // Grant expiration timestamp
    }]
}
\`\`\`
`;

export const msgGrantTemplate = `
Create authorization grant with the following parameters:

Request Format:
\`\`\`json
{
    "messageType": string,               // Type of message to authorize
    "grantee": string,                   // Address of the grantee
    "granter": string                    // Address of the granter
}
\`\`\`

Example Request:
\`\`\`json
{
    "messageType": "/cosmos.bank.v1beta1.MsgSend",
    "grantee": "inj1...",
    "granter": "inj1..."
}
\`\`\`

Response Format:
\`\`\`json
{
    "height": string,                    // Block height
    "txHash": string,                    // Transaction hash
    "grant": {
        "granter": string,               // Granter address
        "grantee": string,               // Grantee address
        "authorization": {
            "type": string,              // Authorization type
            "value": {                   // Authorization details
                "msg": string,           // Authorized message type
                "limit": string | null   // Optional spending limit
            }
        },
        "expiration": string | null,     // Grant expiration timestamp
        "createdAt": number            // Grant creation timestamp
    }
}
\`\`\`
`;

export const msgAuthzExecTemplate = `
Execute messages with authorization with the following parameters:

Request Format:
\`\`\`json
{
    "grantee": string,                   // Address of the grantee
    "msgs": [{                           // Array of messages to execute
        "type": string,                  // Message type
        "value": any                     // Message content
    }]
}
\`\`\`

Example Request:
\`\`\`json
{
    "grantee": "inj1...",
    "msgs": [
        {
            "type": "/cosmos.bank.v1beta1.MsgSend",
            "value": {
                "fromAddress": "inj1...",
                "toAddress": "inj1...",
                "amount": [{
                    "denom": "inj",
                    "amount": "1000000000000000000"
                }]
            }
        }
    ]
}
\`\`\`

Response Format:
\`\`\`json
{
    "height": string,                    // Block height
    "txHash": string,                    // Transaction hash
    "executions": [{
        "messageType": string,           // Executed message type
        "status": string,                // Execution status
        "error": string | null,          // Error if any
        "gasUsed": string               // Gas used for execution
    }],
    "result": {
        "code": number,                  // Response code
        "log": string,                   // Response log
        "gasUsed": string,              // Total gas used
        "gasWanted": string            // Gas wanted
    }
}
\`\`\`
`;

export const msgRevokeTemplate = `
Revoke authorization grant with the following parameters:

Request Format:
\`\`\`json
{
    "messageType": string,               // Type of message authorization to revoke
    "grantee": string,                   // Address of the grantee
    "granter": string                    // Address of the granter
}
\`\`\`

Example Request:
\`\`\`json
{
    "messageType": "/cosmos.bank.v1beta1.MsgSend",
    "grantee": "inj1...",
    "granter": "inj1..."
}
\`\`\`

Response Format:
\`\`\`json
{
    "height": string,                    // Block height
    "txHash": string,                    // Transaction hash
    "revocation": {
        "granter": string,               // Granter address
        "grantee": string,               // Grantee address
        "messageType": string,           // Revoked message type
        "timestamp": number            // Revocation timestamp
    }
}
\`\`\`
`;