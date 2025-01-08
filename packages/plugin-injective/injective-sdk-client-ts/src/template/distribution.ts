// distribution-templates.ts

export const getDelegatorRewardsForValidatorTemplate = `
Extract delegator rewards for validator parameters:
- Delegator address: {{delegatorAddress}}
- Validator address: {{validatorAddress}}
`;

export const getDelegatorRewardsTemplate = `
Extract delegator rewards parameters:
- Injective address: {{injectiveAddress}}
`;

export const msgWithdrawDelegatorRewardTemplate = `
Extract withdraw delegator reward parameters:
- Delegator address: {{delegatorAddress}}
- Validator address: {{validatorAddress}}
`;

export const msgWithdrawValidatorCommissionTemplate = `
Extract withdraw validator commission parameters:
- Validator address: {{validatorAddress}}
`;
