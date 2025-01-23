export const createAgentTemplate = `

Extract the following details to create an agent configuration:

- **signers** (array of strings): A list of signer addresses, each being a 42-character hexadecimal string starting with '0x' (e.g., '0x4EaBF9d330d8C003f71AC7c05fA67DcC0c421651').

- **threshold** (number): The minimum number of signatures required (e.g., 3).

- **converterAddress** (string): The address of the converter contract, a 42-character hexadecimal string starting with '0x' (e.g., '0xc2C85e5f5471c0c87c7c3fB91C3C4f95A7a720C1').

- **agentHeader** (object): Contains the following fields:
  - **messageId** (string): The UUID of the message (e.g., '2fd6db38-ce5c-473f-81c5-4fd62407b7bd').
  - **sourceAgentId** (string): The UUID of the source agent (e.g., '32698bf1-ba3d-4334-8e66-cce5aa0bd3e8').
  - **sourceAgentName** (string): The name of the source agent (e.g., 'Apro AI Agent').
  - **targetAgentId** (string): The UUID of the target agent (e.g., '5c5c6e0a-bbbb-4246-9f1f-81d9f1fed712').
  - **messageType** (number): The type of message, represented as an integer (e.g., 0).
  - **priority** (number): The priority level of the message, represented as an integer (e.g., 1).
  - **ttl** (number): The time-to-live for the message in seconds (e.g., 3600).

Provide the values in the following JSON format:

\`\`\`json
{
    "signers": [
        "<signer_address_1>",
        "<signer_address_2>",
        "..."
    ],
    "threshold": <number>,
    "converterAddress": "<converter_address>",
    "agentHeader": {
        "messageId": "<uuid>",
        "sourceAgentId": "<uuid>",
        "sourceAgentName": "<string>",
        "targetAgentId": "<uuid>",
        "messageType": <number>,
        "priority": <number>,
        "ttl": <number>
    }
}
\`\`\`

Use null for any values that cannot be determined.

Here are the recent user messages for context:

{{recentMessages}}

`;

export const verifyDataTemplate = `
Extract the following details to create a structured JSON response:

- **payload** (object): Contains the following fields:
  - **data** (string): A hexadecimal string representing the data (e.g., '0x1234567890abcdef').
  - **dataHash** (string): A hexadecimal string representing the hash of the data
  - **signatures** (array of objects): Each object contains:
    - **r** (string): The 'r' value of the signature, a hexadecimal string (e.g., '097dda4dd6f7113a710c9b5b56ce458c0791469bb5de01a71a5413ff43eb8b2a').
    - **s** (string): The 's' value of the signature, a hexadecimal string (e.g., '6249bbc444f934de2707d20502d439be8c077d34dd196cfe19bb6e5e251a3a').
    - **v** (number): The 'v' value of the signature, an integer (e.g., 28).
  - **metadata** (object): Contains metadata information:
    - **contentType** (string): The type of content (e.g., 'application/abi').
    - **encoding** (string): The encoding type, use null if not applicable.
    - **compression** (string): The compression type, use null if not applicable.

- **agent** (string): The agent's address, a 42-character hexadecimal string starting with '0x' (e.g., '0x1234567890123456789012345678901234567890').

- **digest** (string): A hexadecimal string representing the digest (e.g., '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890').

Provide the values in the following JSON format:

\`\`\`json
{
    "payload": {
        "data": "<hex_data>",
        "dataHash": "<hex_data_hash>",
        "signatures": [
            {
                "r": "<hex_r>",
                "s": "<hex_s>",
                "v": <number>
            }
        ],
        "metadata": {
            "contentType": "<content_type>",
            "encoding": "<encoding>",
            "compression": "<compression>"
        }
    },
    "agent": "<agent_address>",
    "digest": "<digest>"
}
\`\`\`

Use null for any values that cannot be determined.

Here are the recent user messages for context:

{{recentMessages}}
`;

export const priceQueryTemplate = `

Extract the following details to create a currency pair identifier:

- **pair** (string): A cryptocurrency trading pair in the format of BASE/QUOTE (e.g., "ETH/USD", "BTC/EUR").
  - The base currency comes first (e.g., ETH, BTC)
  - Followed by a forward slash (/)
  - Ends with the quote currency (e.g., USD, EUR)
  - Must be in uppercase letters

Provide the values in the following JSON format:

\`\`\`json
{
    "pair": "<base_currency>/<quote_currency>"
}
\`\`\`

Use null for any values that cannot be determined.

Here are the recent user messages for context:

{{recentMessages}}

`;