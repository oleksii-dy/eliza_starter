// staking-templates.ts
export const getValidatorsTemplate = `
Extract validators query parameters:
- Pagination: {{pagination}} (PaginationOption?) - Optional pagination parameters
`;

export const getValidatorTemplate = `
Extract validator query parameters:
- Address: {{address}} (string) - Validator address to query
`;

export const getValidatorDelegationsTemplate = `
Extract validator delegations query parameters:
- Validator Address: {{validatorAddress}} (string) - Validator address
- Pagination: {{pagination}} (PaginationOption?) - Optional pagination parameters
`;

export const getDelegationTemplate = `
Extract delegation query parameters:
- Injective Address: {{injectiveAddress}} (string) - Delegator address
- Validator Address: {{validatorAddress}} (string) - Validator address
`;

export const getDelegationsTemplate = `
Extract delegations query parameters:
- Injective Address: {{injectiveAddress}} (string) - Delegator address
- Pagination: {{pagination}} (PaginationOption?) - Optional pagination parameters
`;

export const getDelegatorsTemplate = `
Extract delegators query parameters:
- Validator Address: {{validatorAddress}} (string) - Validator address
- Pagination: {{pagination}} (PaginationOption?) - Optional pagination parameters
`;

export const getUnbondingDelegationsTemplate = `
Extract unbonding delegations query parameters:
- Injective Address: {{injectiveAddress}} (string) - Delegator address
- Pagination: {{pagination}} (PaginationOption?) - Optional pagination parameters
`;

export const getReDelegationsTemplate = `
Extract redelegations query parameters:
- Injective Address: {{injectiveAddress}} (string) - Delegator address
- Pagination: {{pagination}} (PaginationOption?) - Optional pagination parameters
`;

export const msgBeginRedelegateTemplate = `
Extract begin redelegate parameters:
- Amount: {{amount}} (object) - Amount to redelegate
  - Denom: {{amount.denom}} (string) - Token denomination
  - Amount: {{amount.amount}} (string) - Amount value
- Source Validator Address: {{srcValidatorAddress}} (string) - Current validator
- Destination Validator Address: {{dstValidatorAddress}} (string) - New validator
`;

export const msgDelegateTemplate = `
Extract delegate parameters:
- Amount: {{amount}} (object) - Amount to delegate
  - Denom: {{amount.denom}} (string) - Token denomination
  - Amount: {{amount.amount}} (string) - Amount value
- Validator Address: {{validatorAddress}} (string) - Validator to delegate to
`;

export const msgUndelegateTemplate = `
Extract undelegate parameters:
- Amount: {{amount}} (object) - Amount to undelegate
  - Denom: {{amount.denom}} (string) - Token denomination
  - Amount: {{amount.amount}} (string) - Amount value
- Validator Address: {{validatorAddress}} (string) - Validator to undelegate from
`;

export const msgCreateValidatorTemplate = `
Extract create validator parameters:
- Description: {{description}} (object) - Validator description
  - Moniker: {{description.moniker}} (string) - Validator name
  - Identity: {{description.identity}} (string) - Identity string (keybase)
  - Website: {{description.website}} (string) - Website URL
  - Security Contact: {{description.securityContact}} (string?) - Optional security contact
  - Details: {{description.details}} (string) - Additional details
- Value: {{value}} (object) - Self-delegation amount
  - Amount: {{value.amount}} (string) - Amount value
  - Denom: {{value.denom}} (string) - Token denomination
- Pub Key: {{pubKey}} (object) - Validator public key
  - Type: {{pubKey.type}} (string) - Key type
  - Value: {{pubKey.value}} (string) - Key value
- Delegator Address: {{delegatorAddress}} (string) - Delegator address
- Validator Address: {{validatorAddress}} (string) - Validator operator address
- Commission: {{commission}} (object) - Commission rates
  - Max Change Rate: {{commission.maxChangeRate}} (string) - Maximum rate change
  - Rate: {{commission.rate}} (string) - Initial commission rate
  - Max Rate: {{commission.maxRate}} (string) - Maximum commission rate
`;

export const msgEditValidatorTemplate = `
Extract edit validator parameters:
- Description: {{description}} (object) - Updated validator description
  - Moniker: {{description.moniker}} (string) - Validator name
  - Identity: {{description.identity}} (string) - Identity string (keybase)
  - Website: {{description.website}} (string) - Website URL
  - Security Contact: {{description.securityContact}} (string?) - Optional security contact
  - Details: {{description.details}} (string) - Additional details
- Validator Address: {{validatorAddress}} (string) - Validator operator address
- Commission Rate: {{commissionRate}} (string?) - Optional new commission rate
- Min Self Delegation: {{minSelfDelegation}} (string?) - Optional new minimum self-delegation
`;

export const msgCancelUnbondingDelegationTemplate = `
Extract cancel unbonding delegation parameters:
- Amount: {{amount}} (object) - Amount to cancel unbonding
  - Denom: {{amount.denom}} (string) - Token denomination
  - Amount: {{amount.amount}} (string) - Amount value
- Validator Address: {{validatorAddress}} (string) - Validator address
- Delegator Address: {{delegatorAddress}} (string) - Delegator address
- Creation Height: {{creationHeight}} (string) - Block height of unbonding creation
`;
