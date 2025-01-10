// Wasm Module Templates

export const msgStoreCodeTemplate = `
Store new Wasm code on the injective blockchain:

**Description**:
This message uploads new Wasm bytecode to the injective blockchain, enabling the instantiation of new smart contracts based on this code. Optional instantiation permissions can be set to restrict who can instantiate contracts from this code.

**Request Format**:
\`\`\`json
{
    "wasmBytes": string | Uint8Array,         // Raw Wasm bytecode as a base64 encoded string or binary
    "instantiatePermission": {                // (Optional) Permissions for instantiation
        "permission": string,                 // Permission type (e.g., "Everybody", "OnlyAddress")
        "address": string                     // (Optional) Address allowed to instantiate
    }
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "wasmBytes": "AGFzbQEAAAABBgFgAX8BfwMCAQAHBwEDfwMCAQAHBwEDfwMCAQAHBg==",
    "instantiatePermission": {
        "permission": "OnlyAddress",
        "address": "inj1admin..."
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
    "data": string,                   // Optional
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
    "height": 123462,
    "txHash": "ABC123abcdef...",
    "codespace": "",
    "code": 0,
    "data": "CgNzdG9yZQ==",
    "rawLog": "[{\"events\": [{\"type\": \"store_code\", \"attributes\": [{\"key\": \"code_id\", \"value\": \"5\"}, {\"key\": \"creator\", \"value\": \"inj1admin...\"}]}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 350000,
    "gasUsed": 300000,
    "timestamp": "2025-01-15T10:20:30Z",
    "events": []
}
\`\`\`
`;

export const msgUpdateAdminTemplate = `
Update the admin of a specific contract:

**Description**:
This message transfers administrative control of a specific smart contract to a new admin address. Only the current admin can initiate this change.

**Request Format**:
\`\`\`json
{
    "newAdmin": string,        // Address of the new admin
    "contract": string         // Address of the contract to update
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "newAdmin": "inj3newadmin...",
    "contract": "inj1contract1..."
}
\`\`\`

**Response Format**:
\`\`\`json
{
    "height": number,
    "txHash": string,
    "codespace": string,
    "code": number,
    "data": string,                   // Optional
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
    "height": 123463,
    "txHash": "DEF456ghijkl...",
    "codespace": "",
    "code": 0,
    "data": "CgZ1cGRhdGVfYWRtaW4AA==",
    "rawLog": "[{\"events\": [{\"type\": \"update_admin\", \"attributes\": [{\"key\": \"contract\", \"value\": \"inj1contract1...\"}, {\"key\": \"new_admin\", \"value\": \"inj3newadmin...\"}]}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 280000,
    "gasUsed": 240000,
    "timestamp": "2025-01-16T07:35:50Z",
    "events": []
}
\`\`\`
`;

export const msgExecuteContractTemplate = `
Execute a smart contract with optional funds:

**Description**:
This message allows users to execute functions within a smart contract. Funds can be optionally sent along with the execution. The execution can include custom arguments or actions defined by the contract.

**Request Format**:
\`\`\`json
{
    "funds": [
        {
            "denom": string,    // Denomination of the funds
            "amount": string    // Amount of the funds
        }
    ],
    "sender": string,             // Address of the sender executing the contract
    "contractAddress": string,    // Address of the smart contract to execute
    "execArgs": object,           // (Optional) Execution arguments
    "exec": {                      // (Optional) Execution with action
        "msg": object,             // Message to send to the contract
        "action": string           // Action identifier
    },
    "msg": object                  // (Optional) Alternative message structure
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "funds": [
        {
            "denom": "inj",
            "amount": "1000"
        }
    ],
    "sender": "inj1sender...",
    "contractAddress": "inj1contract1...",
    "execArgs": {
        "action": "transfer",
        "params": {
            "recipient": "inj1recipient...",
            "amount": "500"
        }
    },
    "exec": {
        "msg": {
            "transfer": {
                "recipient": "inj1recipient...",
                "amount": "500"
            }
        },
        "action": "transfer"
    },
    "msg": {
        "transfer": {
            "recipient": "inj1recipient...",
            "amount": "500"
        }
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
    "data": string,                   // Optional
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
    "height": 123464,
    "txHash": "GHI789mnopqr...",
    "codespace": "",
    "code": 0,
    "data": "CgVleGVjdXRlAA==",
    "rawLog": "[{\"events\": [{\"type\": \"execute_contract\", \"attributes\": [{\"key\": \"sender\", \"value\": \"inj1sender...\"}, {\"key\": \"contract\", \"value\": \"inj1contract1...\"}]}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 400000,
    "gasUsed": 350000,
    "timestamp": "2025-01-17T11:25:35Z",
    "events": []
}
\`\`\`
`;

export const msgMigrateContractTemplate = `
Migrate a smart contract to a new code version:

**Description**:
This message updates a smart contract to a new code version, allowing for upgrades and improvements without changing the contract address. Only the current admin can perform migrations.

**Request Format**:
\`\`\`json
{
    "contract": string,        // Address of the contract to migrate
    "codeId": number,          // ID of the new code to migrate to
    "msg": object               // Migration message with parameters
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "contract": "inj1contract1...",
    "codeId": 6,
    "msg": {
        "upgrade": {
            "new_owner": "inj1newadmin..."
        }
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
    "data": string,                   // Optional
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
    "height": 123465,
    "txHash": "JKL012stuvwx...",
    "codespace": "",
    "code": 0,
    "data": "Cg1taWdyaXRhdGUAA==",
    "rawLog": "[{\"events\": [{\"type\": \"migrate_contract\", \"attributes\": [{\"key\": \"contract\", \"value\": \"inj1contract1...\"}, {\"key\": \"new_code_id\", \"value\": \"6\"}]}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 450000,
    "gasUsed": 400000,
    "timestamp": "2025-01-18T13:50:10Z",
    "events": []
}
\`\`\`
`;

export const msgInstantiateContractTemplate = `
Instantiate a new smart contract:

**Description**:
This message creates a new instance of a smart contract using stored Wasm code. Optional funds can be sent along with the instantiation. The contract is initialized with specific parameters defined in the initialization message.

**Request Format**:
\`\`\`json
{
    "admin": string,            // Address of the contract admin
    "codeId": number,           // ID of the code to instantiate
    "label": string,            // Human-readable label for the contract
    "msg": object,              // Initialization message with parameters
    "amount": [                 // (Optional) Funds to send with instantiation
        {
            "denom": string,    // Denomination of the funds
            "amount": string    // Amount of the funds
        }
    ]
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "admin": "inj1admin...",
    "codeId": 5,
    "label": "MySmartContractInstance",
    "msg": {
        "init": {
            "owner": "inj1admin...",
            "config": {
                "theme": "dark"
            }
        }
    },
    "amount": [
        {
            "denom": "inj",
            "amount": "1000"
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
    "data": string,                           // Optional
    "rawLog": string,
    "logs": [],                               // Optional
    "info": string,                           // Optional
    "gasWanted": number,
    "gasUsed": number,
    "timestamp": string,
    "events": []                              // Optional
}
\`\`\`

**Example Response**:
\`\`\`json
{
    "height": 123466,
    "txHash": "MNO345yzabcd...",
    "codespace": "",
    "code": 0,
    "data": "CgRpbnN0YW50aWF0ZQ==",
    "rawLog": "[{\"events\": [{\"type\": \"instantiate_contract\", \"attributes\": [{\"key\": \"admin\", \"value\": \"inj1admin...\"}, {\"key\": \"code_id\", \"value\": \"5\"}, {\"key\": \"contract_address\", \"value\": \"inj1newcontract...\"}]}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 500000,
    "gasUsed": 450000,
    "timestamp": "2025-01-19T18:00:00Z",
    "events": []
}
\`\`\`
`;

export const msgExecuteContractCompatTemplate = `
Execute a smart contract with compatibility options:

**Description**:
This message provides additional flexibility when executing smart contracts by allowing alternative message structures and execution parameters. It supports both standard and customized execution methods.

**Request Format**:
\`\`\`json
{
    "funds": [
        {
            "denom": string,    // Denomination of the funds
            "amount": string    // Amount of the funds
        }
    ],
    "contractAddress": string,    // Address of the smart contract to execute
    "execArgs": object,           // (Optional) Execution arguments
    "exec": {                      // (Optional) Execution with action
        "msg": Record<string, any>, // Message to send to the contract
        "action": string           // Action identifier
    },
    "msg": Record<string, any>    // (Optional) Alternative message structure
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "funds": [
        {
            "denom": "inj",
            "amount": "2000"
        }
    ],
    "contractAddress": "inj1contract1...",
    "execArgs": {
        "action": "deposit",
        "params": {
            "amount": "2000"
        }
    },
    "exec": {
        "msg": {
            "deposit": {
                "amount": "2000"
            }
        },
        "action": "deposit"
    },
    "msg": {
        "deposit": {
            "amount": "2000"
        }
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
    "data": string,                   // Optional
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
    "height": 123467,
    "txHash": "PQR678ghijkl...",
    "codespace": "",
    "code": 0,
    "data": "CgVleGVjdXRlAA==",
    "rawLog": "[{\"events\": [{\"type\": \"execute_contract_compat\", \"attributes\": [{\"key\": \"contract\", \"value\": \"inj1contract1...\"}, {\"key\": \"action\", \"value\": \"deposit\"}]}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 420000,
    "gasUsed": 380000,
    "timestamp": "2025-01-20T21:15:35Z",
    "events": []
}
\`\`\`
`;

export const msgPrivilegedExecuteContractTemplate = `
Privileged execution of a smart contract:

**Description**:
This message allows privileged users to execute functions within a smart contract, potentially bypassing certain restrictions or enabling administrative actions. It should be used with caution to maintain contract integrity and security.

**Request Format**:
\`\`\`json
{
    "funds": string,                 // Funds to send as a JSON string
    "contractAddress": string,       // Address of the smart contract to execute
    "data": {                        // Execution arguments with privileged access
        "msg": object,                // Message to send to the contract
        "action": string              // Action identifier
    }
}
\`\`\`

**Example Request**:
\`\`\`json
{
    "funds": "[{\"denom\": \"inj\", \"amount\": \"500\"}]",
    "contractAddress": "inj1contract1...",
    "data": {
        "msg": {
            "update_config": {
                "theme": "light"
            }
        },
        "action": "update_config"
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
    "data": string,                   // Optional
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
    "height": 123468,
    "txHash": "STU901mnopqr...",
    "codespace": "",
    "code": 0,
    "data": "CgZwcml2aWxlZ2VkAA==",
    "rawLog": "[{\"events\": [{\"type\": \"privileged_execute_contract\", \"attributes\": [{\"key\": \"contract\", \"value\": \"inj1contract1...\"}, {\"key\": \"action\", \"value\": \"update_config\"}]}]}]",
    "logs": [],
    "info": "",
    "gasWanted": 500000,
    "gasUsed": 450000,
    "timestamp": "2025-01-21T05:40:25Z",
    "events": []
}
\`\`\`
`;
