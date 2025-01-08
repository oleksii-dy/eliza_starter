// auth-templates.ts

export const getGrantsTemplate = `
Extract authorization grants parameters:
- Granter address: {{granter}}
- Grantee address: {{grantee}}
- Pagination key: {{paginationKey}}
- Pagination limit: {{limit}}
`;

export const getGranterGrantsTemplate = `
Extract granter grants parameters:
- Granter address: {{granter}}
- Pagination key: {{paginationKey}}
- Pagination limit: {{limit}}
- Pagination reverse : {{reverse}}
- Pagination countTotal : {{countTotal}}
- Pagination endTime : {{endTime}}
- Pagination startTime : {{startTime}}
- Pagination fromNumber : {{fromNumber}}
- Pagination toNumber : {{toNumber}}
if pagination options are not specified assume null
`;

export const getGranteeGrantsTemplate = `
Extract grantee grants parameters:
- Grantee address: {{grantee}}
- Pagination key: {{paginationKey}}
- Pagination limit: {{limit}}
- Pagination reverse : {{reverse}}
- Pagination countTotal : {{countTotal}}
- Pagination endTime : {{endTime}}
- Pagination startTime : {{startTime}}
- Pagination fromNumber : {{fromNumber}}
- Pagination toNumber : {{toNumber}}
if pagination options are not specified assume null
`;

export const msgGrantTemplate = `
Extract grant message parameters:
- Message type: {{messageType}}
- Grantee address: {{grantee}}
- Granter address: {{granter}}
`;

export const msgAuthzExecTemplate = `
Extract authorization execution parameters:
- Grantee address: {{grantee}}
- Messages: {{msgs}}
`;

export const msgRevokeTemplate = `
Extract revoke authorization parameters:
- Message type: {{messageType}}
- Grantee address: {{grantee}}
- Granter address: {{granter}}
`;
