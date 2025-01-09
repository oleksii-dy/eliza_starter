// ibc-templates.ts
export const getDenomTraceTemplate = `
Extract denom trace query parameters:
- Hash: {{hash}} (string) - Hash of the denomination trace
`;

export const getDenomsTraceTemplate = `
Extract denoms trace query parameters:
- Pagination: {{pagination}} (PaginationOption?) - Optional pagination parameters
`;

export const msgIBCTransferTemplate = `
Extract IBC transfer parameters:
- Amount: {{amount}} (object) - Amount to transfer
  - Denom: {{amount.denom}} (string) - Token denomination
  - Amount: {{amount.amount}} (string) - Transfer amount
- Memo: {{memo}} (string?) - Optional transfer memo
- Sender: {{sender}} (string) - Source address
- Port: {{port}} (string) - Source port ID
- Receiver: {{receiver}} (string) - Destination address
- Channel ID: {{channelId}} (string) - Channel identifier
- Timeout: {{timeout}} (number?) - Optional timeout in seconds
- Height: {{height}} (object?) - Optional timeout height
  - Revision Height: {{height.revisionHeight}} (number) - Block height
  - Revision Number: {{height.revisionNumber}} (number) - Chain revision number
`;

export const ibcTransferParamsTemplate = `
Extract IBC transfer query parameters:
- Sender: {{sender}} (string?) - Optional source address filter
- Receiver: {{receiver}} (string?) - Optional destination address filter
- Source Channel: {{srcChannel}} (string?) - Optional source channel filter
- Source Port: {{srcPort}} (string?) - Optional source port filter
- Destination Channel: {{destChannel}} (string?) - Optional destination channel filter
- Destination Port: {{destPort}} (string?) - Optional destination port filter
- Limit: {{limit}} (number?) - Optional result limit
- Skip: {{skip}} (number?) - Optional number of results to skip
`;
