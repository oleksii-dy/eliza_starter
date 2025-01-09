// auth-templates.ts
export const authAccountTemplate = `
Extract auth account parameters:
- Account Address: {{accountAddress}} (string) - The address of the account to query
`;

export const getGrantsTemplate = `
Extract grants parameters:
- Granter: {{granter}} (string) - Address of the account that granted permissions
- Grantee: {{grantee}} (string) - Address of the account that received permissions
- Pagination: {{pagination}} (PaginationOption?) - Optional pagination parameters
`;

export const getGranterGrantsTemplate = `
Extract granter grants parameters:
- Granter: {{granter}} (string) - Address of the granter to query authorizations for
- Pagination: {{pagination}} (PaginationOption?) - Optional pagination parameters
`;

export const getGranteeGrantsTemplate = `
Extract grantee grants parameters:
- Grantee: {{grantee}} (string) - Address of the grantee to query authorizations for
- Pagination: {{pagination}} (PaginationOption?) - Optional pagination parameters
`;

export const msgGrantTemplate = `
Extract message grant parameters:
- Message Type: {{messageType}} (string) - Type of message being authorized
- Grantee: {{grantee}} (string) - Address receiving the authorization
- Granter: {{granter}} (string) - Address granting the authorization
`;

export const msgAuthzExecTemplate = `
Extract authorization execution parameters:
- Grantee: {{grantee}} (string) - Address executing the authorized transaction
- Messages: {{msgs}} (Msgs | Msgs[]) - Messages to execute under authorization
`;

export const msgRevokeTemplate = `
Extract revocation parameters:
- Message Type: {{messageType}} (string) - Type of message authorization to revoke
- Grantee: {{grantee}} (string) - Address whose authorization is being revoked
- Granter: {{granter}} (string) - Address that granted the authorization
`;
