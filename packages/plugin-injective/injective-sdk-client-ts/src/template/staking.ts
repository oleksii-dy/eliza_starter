// staking-templates.ts

export const getValidatorsTemplate = `
Extract validators query parameters:
- Pagination key: {{paginationKey}}
- Pagination limit: {{limit}}
`;

export const getValidatorTemplate = `
Extract validator query parameters:
- Validator address: {{address}}
`;

export const getDelegationTemplate = `
Extract delegation query parameters:
- Injective address: {{injectiveAddress}}
- Validator address: {{validatorAddress}}
`;

export const msgDelegateTemplate = `
Extract delegate message parameters:
- Amount: {{amount}}
- Denom: {{denom}}
- Validator address: {{validatorAddress}}
`;

export const msgUndelegateTemplate = `
Extract undelegate message parameters:
- Amount: {{amount}}
- Denom: {{denom}}
- Validator address: {{validatorAddress}}
`;

export const msgBeginRedelegateTemplate = `
Extract begin redelegate parameters:
- Amount: {{amount}}
- Denom: {{denom}}
- Source validator address: {{srcValidatorAddress}}
- Destination validator address: {{dstValidatorAddress}}
`;

export const msgCreateValidatorTemplate = `
Extract create validator parameters:
- Moniker: {{moniker}}
- Identity: {{identity}}
- Website: {{website}}
- Security contact: {{securityContact}}
- Details: {{details}}
- Amount: {{amount}}
- Denom: {{denom}}
- Commission rate: {{rate}}
- Max rate: {{maxRate}}
- Max change rate: {{maxChangeRate}}
`;

export const msgEditValidatorTemplate = `
Extract edit validator parameters:
- Description: {{description}}
- Validator address: {{validatorAddress}}
- Commission rate: {{commissionRate}}
- Min self delegation: {{minSelfDelegation}}
`;
