export const createAgentTemplate = `
TASK: Extract ONLY the explicitly mentioned details from the user's input messages to create an agent configuration. DO NOT generate, infer or create any data that is not explicitly present in the input.

RULES:
1. ONLY extract information that is explicitly present in the user's messages
2. Use null for ANY field where the exact required information is not present
3. Do not make assumptions or generate random values
4. If no valid data can be extracted, return a JSON with all null values
5. Only accept properly formatted addresses and UUIDs - do not create or infer them

REQUIRED FIELDS:
- signers: Array of valid Ethereum addresses (42-char hex starting with '0x')
- threshold: Explicit number mentioned as threshold
- converterAddress: Valid Ethereum address (42-char hex starting with '0x')
- agentHeader: Object containing:
  * messageId: Valid UUID format only
  * sourceAgentId: Valid UUID format only
  * sourceAgentName: Explicit agent name
  * targetAgentId: Valid UUID format only
  * messageType: Explicit number
  * priority: Explicit number
  * ttl: Explicit number in seconds

OUTPUT FORMAT:
\`\`\`json
{
    "signers": [
        "<ONLY-EXPLICITLY-MENTIONED-ADDRESSES>"
    ],
    "threshold": null,
    "converterAddress": null,
    "agentHeader": {
        "messageId": null,
        "sourceAgentId": null,
        "sourceAgentName": null,
        "targetAgentId": null,
        "messageType": null,
        "priority": null,
        "ttl": null
    }
}
\`\`\`

VALIDATION:
- Ethereum addresses must be 42 characters starting with '0x'
- UUIDs must match standard UUID format
- Numbers must be explicitly mentioned in the context
- Do not include any fields or values that are not explicitly mentioned in the user's input

Context messages:
{{recentMessages}}
`;

export const verifyDataTemplate = `
TASK: STRICTLY extract ONLY explicitly mentioned verification details from the user's input messages. DO NOT generate, infer, or create any data that is not explicitly present in the input.

STRICT RULES:
1. ONLY extract information that is EXPLICITLY present in the user's messages
2. Set null for ANY field where the exact required information is not present
3. DO NOT create, generate, or infer any values
4. Return all fields as null if no valid data can be extracted
5. Only accept properly formatted hexadecimal strings and numbers
6. Reject and set to null any values that don't match the required format

REQUIRED FORMATS:
1. Hexadecimal strings must:
   - Start with '0x'
   - Contain only valid hex characters (0-9, a-f, A-F)
   - Match the expected length for their purpose

2. Ethereum addresses must:
   - Be exactly 42 characters long
   - Start with '0x'
   - Contain only valid hex characters

3. Numbers must:
   - Be explicitly mentioned
   - Be valid integers
   - Be in the appropriate range for their purpose

FIELD SPECIFICATIONS:
payload:
  - data: Must be valid hex string starting with '0x'
  - dataHash: Must be valid hex string starting with '0x'
  - signatures: Array of objects, each containing:
    * r: 64-character hex string (without '0x')
    * s: 64-character hex string (without '0x')
    * v: Integer number
  - metadata:
    * contentType: String matching known content types
    * encoding: String or null
    * compression: String or null

agent: Must be valid 42-character Ethereum address
digest: Must be valid hex string starting with '0x'

OUTPUT FORMAT:
\`\`\`json
{
    "payload": {
        "data": null,
        "dataHash": null,
        "signatures": [],
        "metadata": {
            "contentType": null,
            "encoding": null,
            "compression": null
        }
    },
    "agent": null,
    "digest": null
}
\`\`\`

VALIDATION RULES:
1. For hex strings:
   - Verify proper '0x' prefix where required
   - Verify correct length
   - Verify only valid hex characters

2. For signatures:
   - Only include if complete r, s, v values are present
   - Verify r and s are valid 64-character hex strings
   - Verify v is a valid integer

3. For metadata:
   - Only include contentType if it matches known formats
   - Set encoding and compression to null if not explicitly specified

4. General:
   - Do not attempt to calculate or derive missing values
   - Do not fill in partial information
   - Return empty arrays instead of null for array fields when no valid items exist

Input context to process:
{{recentMessages}}

Remember: When in doubt, use null. Never generate fake data.
`;

export const priceQueryTemplate = `
TASK: STRICTLY extract cryptocurrency trading pair information from user input. ONLY extract pairs that are EXPLICITLY mentioned in the format BASE/QUOTE or similar recognizable patterns.

TRADING PAIR RULES:
1. Valid Format Requirements:
   - Must contain two currency symbols separated by a delimiter
   - Acceptable delimiters: '/', '-', '_', or space
   - Both currencies must be valid cryptocurrency or fiat currency symbols
   - Convert all pairs to standardized FORMAT: BASE/QUOTE
   - Convert all letters to uppercase

2. Valid Currency Examples:
   - Cryptocurrencies: BTC, ETH, USDT, BNB, XRP, etc.
   - Fiat currencies: USD, EUR, JPY, GBP, etc.

3. Pattern Recognition:
   - "BTC/USD" -> Valid
   - "BTC-USD" -> Convert to "BTC/USD"
   - "BTC USD" -> Convert to "BTC/USD"
   - "BTCUSD" -> Convert to "BTC/USD"
   - "Bitcoin/USD" -> Invalid (must use symbol)
   - "BTC to USD" -> Convert to "BTC/USD"

STRICT VALIDATION:
1. REJECT and return null if:
   - Only one currency is mentioned
   - Currencies use full names instead of symbols
   - Format is completely unrecognizable
   - Symbols are invalid or unknown
   - More than two currencies are mentioned
   - Symbols contain invalid characters

2. Currency Symbol Requirements:
   - Must be 2-5 characters long
   - Must contain only letters
   - Must be recognized cryptocurrency or fiat symbols
   - Must be uppercase in output

OUTPUT FORMAT:
\`\`\`json
{
    "pair": null
}
\`\`\`

EXAMPLES:
Input: "What's the ETH/USD price?"
Output: {"pair": "ETH/USD"}

Input: "Show me ethereum price"
Output: {"pair": null}

Input: "BTC to USDT"
Output: {"pair": "BTC/USDT"}

Input: "What's the price?"
Output: {"pair": null}

IMPORTANT NOTES:
1. DO NOT generate or infer trading pairs
2. DO NOT create pairs from context
3. ONLY extract explicitly mentioned pairs
4. When in doubt, return null
5. DO NOT accept invalid or unofficial symbols

Input context to process:
{{recentMessages}}
`;