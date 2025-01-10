// Auth and Authz Modules Templates

export const getAuthModuleParamsTemplate = `
### Get Auth Module Parameters

**Description**:
This query retrieves the current parameters of the Authentication (Auth) module. The Auth module is responsible for managing account information, including account creation, authentication, and maintaining the state of user accounts within the blockchain ecosystem. Understanding these parameters is essential for monitoring account policies, authentication mechanisms, and overall network security.

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
    "data": string,                   // Optional: Base64 encoded data containing auth module parameters
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
    "height": 124200,
    "txHash": "ABC123authparamsxyz...",
    "codespace": "",
    "code": 0,
    "data": "Cg1hdXRob21fbW9kdWxlX3BhcmFtcyAA==",
    "rawLog": "[{\"events\": [{\"type\": \"get_auth_module_params\", \"attributes\": []}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 85000,
    "gasUsed": 65000,
    "timestamp": "2025-09-10T10:00:00Z",
    "events": []
}
\`\`\`
`;

export const getAccountDetailsTemplate = `
### Get Account Details

**Description**:
This query retrieves the details of the current account within the Auth module. Account details include essential information such as account address, account number, sequence number, and other relevant metadata. Monitoring account details is crucial for managing user accounts, ensuring account security, and tracking account activities on the blockchain.

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
    "data": string,                   // Optional: Base64 encoded data containing account details
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
    "height": 124201,
    "txHash": "DEF456accountdetailsxyz...",
    "codespace": "",
    "code": 0,
    "data": "CgdhY2NvdW50RGV0YWlscwA=",
    "rawLog": "[{\"events\": [{\"type\": \"get_account_details\", \"attributes\": [{\"key\": \"injective_address\", \"value\": \"inj1account123...\"}]}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 90000,
    "gasUsed": 70000,
    "timestamp": "2025-09-11T11:15:30Z",
    "events": []
}
\`\`\`
`;

export const getAccountsTemplate = `
### Get Accounts

**Description**:
This query retrieves all accounts associated with the current address within the Auth module. Fetching all accounts provides a comprehensive view of all accounts managed by a single user or entity, facilitating better account management, auditing, and security oversight. Understanding all associated accounts helps in tracking asset distribution and managing multi-account strategies.

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
    "data": string,                   // Optional: Base64 encoded data containing all account details
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
    "height": 124202,
    "txHash": "GHI789getaccountsxyz...",
    "codespace": "",
    "code": 0,
    "data": "W3siYWNjb3VudCI6ICJpbjFhY2NvdW50MTIzIiwgImFtb3VudCI6ICIxMDAwMCJ9LCB7ImFjY291bnQiOiAiaW4yYWNjb3VudDQ1NiIsICJhbW91bnQiOiAiMjAwMDAwIn1d",
    "rawLog": "[{\"events\": [{\"type\": \"get_accounts\", \"attributes\": []}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 95000,
    "gasUsed": 75000,
    "timestamp": "2025-09-12T12:20:40Z",
    "events": []
}
\`\`\`
`;

export const getGrantsTemplate = `
### Get Grants

**Description**:
This query retrieves all authorization grants based on the provided parameters within the Authz module. Authorization grants allow one account (the granter) to authorize another account (the grantee) to perform specific actions on their behalf. Monitoring grants is essential for managing permissions, ensuring security, and auditing delegated actions within the blockchain ecosystem.

**Request Format**:
\`\`\`json
{
    "filter": {
        "granter": string,                  // (Optional) Address of the granter
        "grantee": string,                  // (Optional) Address of the grantee
        "messageType": string               // (Optional) Type of message authorized (e.g., "/cosmos.bank.v1beta1.MsgSend")
    },
    "pagination": {
        "limit": number,                    // (Optional) Number of grants to retrieve
        "offset": number                    // (Optional) Starting point for retrieval
    }
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "filter": {
        "granter": "inj1granter123...",
        "grantee": "inj1grantee456...",
        "messageType": "/cosmos.bank.v1beta1.MsgSend"
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
    "txHash": string,
    "codespace": string,
    "code": number,
    "data": string,                   // Optional: Base64 encoded data containing grants
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
    "height": 124300,
    "txHash": "JKL012getgrantsxyz...",
    "codespace": "",
    "code": 0,
    "data": "CgpncmFudHMA",
    "rawLog": "[{\"events\": [{\"type\": \"get_grants\", \"attributes\": []}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 100000,
    "gasUsed": 80000,
    "timestamp": "2025-09-13T13:25:50Z",
    "events": []
}
\`\`\`
`;

export const getGranterGrantsTemplate = `
### Get Grants by Granter

**Description**:
This query retrieves all authorization grants granted by a specific granter within the Authz module. Authorization grants allow one account (the granter) to authorize another account (the grantee) to perform specific actions on their behalf. Monitoring grants by granter is essential for managing delegated permissions, ensuring security, and auditing the scope of granted authorizations within the blockchain ecosystem.

**Request Format**:
\`\`\`json
{
    "granter": string,                  // Address of the granter (e.g., "inj1granter123...")
    "pagination": {
        "limit": number,                    // (Optional) Number of grants to retrieve
        "offset": number                    // (Optional) Starting point for retrieval
    }
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "granter": "inj1granter123...",
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
    "data": string,                   // Optional: Base64 encoded data containing grants by granter
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
    "height": 124301,
    "txHash": "MNO345grantergrantsxyz...",
    "codespace": "",
    "code": 0,
    "data": "CgpncmFudGVycw==",
    "rawLog": "[{\"events\": [{\"type\": \"get_granter_grants\", \"attributes\": []}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 105000,
    "gasUsed": 85000,
    "timestamp": "2025-09-14T14:30:00Z",
    "events": []
}
\`\`\`
`;

export const getGranteeGrantsTemplate = `
### Get Grants by Grantee

**Description**:
This query retrieves all authorization grants received by a specific grantee within the Authz module. Authorization grants allow one account (the granter) to authorize another account (the grantee) to perform specific actions on their behalf. Monitoring grants by grantee is essential for managing delegated permissions, ensuring security, and auditing the scope of received authorizations within the blockchain ecosystem.

**Request Format**:
\`\`\`json
{
    "grantee": string,                  // Address of the grantee (e.g., "inj1grantee456...")
    "pagination": {
        "limit": number,                    // (Optional) Number of grants to retrieve
        "offset": number                    // (Optional) Starting point for retrieval
    }
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "grantee": "inj1grantee456...",
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
    "data": string,                   // Optional: Base64 encoded data containing grants by grantee
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
    "height": 124302,
    "txHash": "UVW234granteegantsxyz...",
    "codespace": "",
    "code": 0,
    "data": "CgpncmFudGVlcw==",
    "rawLog": "[{\"events\": [{\"type\": \"get_grantee_grants\", \"attributes\": []}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 110000,
    "gasUsed": 90000,
    "timestamp": "2025-09-15T15:35:10Z",
    "events": []
}
\`\`\`
`;

export const msgGrantTemplate = `
### Grant Authorization

**Description**:
This message broadcasts a transaction to grant authorization to a grantee to perform specific actions on behalf of the granter within the Authz module. Granting authorization allows for delegated permissions, enabling more flexible and secure management of actions without requiring direct user involvement for each operation. Successfully granting authorization updates the system state, reflecting the new permissions.

**Request Format**:
\`\`\`json
{
    "messageType": string,               // Type of message authorized (e.g., "/cosmos.bank.v1beta1.MsgSend")
    "grantee": string,                   // Address of the grantee (e.g., "inj1grantee456...")
    "granter": string                    // Address of the granter (e.g., "inj1granter123...")
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "messageType": "/cosmos.bank.v1beta1.MsgSend",
    "grantee": "inj1grantee456...",
    "granter": "inj1granter123..."
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
    "height": 124303,
    "txHash": "YZA678grantauthxyz...",
    "codespace": "",
    "code": 0,
    "data": "CgZncmFudAA=",
    "rawLog": "[{\"events\": [{\"type\": \"grant_authorization\", \"attributes\": [{\"key\": \"message_type\", \"value\": \"/cosmos.bank.v1beta1.MsgSend\"}, {\"key\": \"grantee\", \"value\": \"inj1grantee456...\"}, {\"key\": \"granter\", \"value\": \"inj1granter123...\"}]}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 200000,
    "gasUsed": 160000,
    "timestamp": "2025-09-16T16:40:20Z",
    "events": []
}
\`\`\`
`;

export const msgExecTemplate = `
### Execute Authorized Messages

**Description**:
This message broadcasts a transaction to execute authorized messages on behalf of the grantee within the Authz module. Executing authorized messages allows the grantee to perform actions as permitted by the granter without requiring direct user intervention for each operation. Successfully executing authorized messages performs the intended actions and updates the system state accordingly.

**Request Format**:
\`\`\`json
{
    "grantee": string,                   // Address of the grantee (e.g., "inj1grantee456...")
    "msgs": [
        {
            "typeUrl": string,            // Type URL of the message (e.g., "/cosmos.bank.v1beta1.MsgSend")
            "value": object               // JSON object containing the specific message data
        }
    ]
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "grantee": "inj1grantee456...",
    "msgs": [
        {
            "typeUrl": "/cosmos.bank.v1beta1.MsgSend",
            "value": {
                "fromAddress": "inj1grantee456...",
                "toAddress": "inj1receiver789...",
                "amount": [
                    {
                        "denom": "uatom",
                        "amount": "500"
                    }
                ]
            }
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
    "height": 124304,
    "txHash": "BCD901execauthxyz...",
    "codespace": "",
    "code": 0,
    "data": "CgVleGVjdAA=",
    "rawLog": "[{\"events\": [{\"type\": \"exec_authorized_msgs\", \"attributes\": [{\"key\": \"grantee\", \"value\": \"inj1grantee456...\"}, {\"key\": \"msg_type\", \"value\": \"/cosmos.bank.v1beta1.MsgSend\"}]}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 220000,
    "gasUsed": 180000,
    "timestamp": "2025-09-17T17:45:30Z",
    "events": []
}
\`\`\`
`;

export const msgRevokeTemplate = `
### Revoke Authorization

**Description**:
This message broadcasts a transaction to revoke previously granted authorizations from a grantee within the Authz module. Revoking authorization removes the delegated permissions, preventing the grantee from performing actions on behalf of the granter. Successfully revoking authorization updates the system state, ensuring that the grantee no longer has the previously granted permissions.

**Request Format**:
\`\`\`json
{
    "messageType": string,               // Type of message authorized to revoke (e.g., "/cosmos.bank.v1beta1.MsgSend")
    "grantee": string,                   // Address of the grantee (e.g., "inj1grantee456...")
    "granter": string                    // Address of the granter (e.g., "inj1granter123...")
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "messageType": "/cosmos.bank.v1beta1.MsgSend",
    "grantee": "inj1grantee456...",
    "granter": "inj1granter123..."
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
    "height": 124305,
    "txHash": "EFG012revokeauthxyz...",
    "codespace": "",
    "code": 0,
    "data": "CgdyZXZva2UA",
    "rawLog": "[{\"events\": [{\"type\": \"revoke_authorization\", \"attributes\": [{\"key\": \"message_type\", \"value\": \"/cosmos.bank.v1beta1.MsgSend\"}, {\"key\": \"grantee\", \"value\": \"inj1grantee456...\"}, {\"key\": \"granter\", \"value\": \"inj1granter123...\"}]}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 210000,
    "gasUsed": 170000,
    "timestamp": "2025-09-18T18:50:40Z",
    "events": []
}
\`\`\`
`;
