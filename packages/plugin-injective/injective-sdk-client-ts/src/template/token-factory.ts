// token-factory-templates.ts

export const getDenomsFromCreatorTemplate = `
Extract denoms from creator parameters:
- Creator address: {{creator}}
`;

export const getDenomAuthorityMetadataTemplate = `
Extract denom authority metadata parameters:
- Creator: {{creator}}
- Sub denom: {{subDenom}}
`;

export const msgCreateDenomTemplate = `
Extract create denom parameters:
- Subdenom: {{subdenom}}
- Decimals: {{decimals}}
- Name: {{name}}
- Symbol: {{symbol}}
`;

export const msgMintTemplate = `
Extract mint parameters:
- Amount: {{amount}}
- Denom: {{denom}}
`;

export const msgBurnTemplate = `
Extract burn parameters:
- Amount: {{amount}}
- Denom: {{denom}}
`;

export const msgChangeAdminTemplate = `
Extract change admin parameters:
- Denom: {{denom}}
- New admin: {{newAdmin}}
`;

export const msgSetDenomMetadataTemplate = `
Extract set denom metadata parameters:
- Name: {{name}}
- Symbol: {{symbol}}
- Description: {{description}}
- Display: {{display}}
- Base: {{base}}
- Display exponent: {{displayExponent}}
`;
