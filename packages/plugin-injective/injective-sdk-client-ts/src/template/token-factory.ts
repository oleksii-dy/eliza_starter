// token-factory-templates.ts
export const getDenomsFromCreatorTemplate = `
Extract denoms from creator query parameters:
- Creator: {{creator}} (string) - Address of the token creator
`;

export const getDenomAuthorityMetadataTemplate = `
Extract denom authority metadata query parameters:
- Creator: {{creator}} (string) - Address of the token creator
- Sub Denom: {{subDenom}} (string) - Token sub-denomination
`;

export const msgBurnTemplate = `
Extract token burn parameters:
- Amount: {{amount}} (object) - Amount to burn
  - Amount: {{amount.amount}} (string) - Amount value
  - Denom: {{amount.denom}} (string) - Token denomination
`;

export const msgChangeAdminTemplate = `
Extract change admin parameters:
- Denom: {{denom}} (string) - Token denomination
- New Admin: {{newAdmin}} (string) - Address of the new admin
`;

export const msgCreateDenomTemplate = `
Extract create denom parameters:
- Subdenom: {{subdenom}} (string) - Token sub-denomination
- Decimals: {{decimals}} (number?) - Optional decimal places
- Name: {{name}} (string?) - Optional token name
- Symbol: {{symbol}} (string?) - Optional token symbol
`;

export const msgMintTemplate = `
Extract token mint parameters:
- Total Amount: {{totalAmount}} (object) - Amount to mint
  - Amount: {{totalAmount.amount}} (string) - Amount value
  - Denom: {{totalAmount.denom}} (string) - Token denomination
`;

export const msgSetDenomMetadataTemplate = `
Extract set denom metadata parameters:
- Metadata: {{metadata}} (Metadata) - Token metadata configuration
  - Description: {{metadata.description}} (string) - Token description
  - DenomUnits: {{metadata.denomUnits}} (DenomUnit[]) - Denomination units
  - Base: {{metadata.base}} (string) - Base denomination
  - Display: {{metadata.display}} (string) - Display denomination
  - Name: {{metadata.name}} (string) - Token name
  - Symbol: {{metadata.symbol}} (string) - Token symbol
`;
