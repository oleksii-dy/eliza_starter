// permissions-templates.ts
export const getAddressesByRoleTemplate = `
Extract addresses by role query parameters:
- Denom: {{denom}} (string) - Token denomination
- Role: {{role}} (string) - Role to query addresses for
`;

export const getAddressRolesTemplate = `
Extract address roles query parameters:
- Address: {{address}} (string) - Address to query roles for
- Denom: {{denom}} (string) - Token denomination
`;

export const getNamespaceByDenomTemplate = `
Extract namespace query parameters:
- Denom: {{denom}} (string) - Token denomination
- Include Roles: {{includeRoles}} (boolean) - Whether to include role information
`;

export const getVouchersForAddressTemplate = `
Extract vouchers query parameters:
- Address: {{address}} (string) - Address to query vouchers for
`;