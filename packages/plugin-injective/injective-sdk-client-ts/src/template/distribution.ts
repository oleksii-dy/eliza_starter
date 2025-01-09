// distribution-templates.ts
export const delegatorValidatorTemplate = `
Extract delegator-validator relationship parameters:
- Delegator Address: {{delegatorAddress}} (string) - Address of the delegator
- Validator Address: {{validatorAddress}} (string) - Address of the validator
`;

export const msgWithdrawDelegatorRewardTemplate = `
Extract delegator reward withdrawal parameters:
- Delegator Address: {{delegatorAddress}} (string) - Address of the delegator claiming rewards
- Validator Address: {{validatorAddress}} (string) - Address of the validator to claim rewards from
`;

export const msgWithdrawValidatorCommissionTemplate = `
Extract validator commission withdrawal parameters:
- Validator Address: {{validatorAddress}} (string) - Address of the validator claiming commission
`;

export const getDelegatorRewardsForValidatorTemplate = `
Extract delegator rewards query parameters:
- Delegator Address: {{delegatorAddress}} (string) - Address of the delegator
- Validator Address: {{validatorAddress}} (string) - Address of the validator
`;

export const getDelegatorRewardsTemplate = `
Extract delegator rewards query parameters:
- Injective Address: {{injectiveAddress}} (string) - Address of the delegator to query rewards for
`;