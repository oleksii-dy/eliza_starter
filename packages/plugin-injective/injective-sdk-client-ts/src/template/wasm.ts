// wasm-templates.ts
export const getContractAccountsBalanceTemplate = `
Extract contract accounts balance query parameters:
- Contract Address: {{contractAddress}} (string) - Address of the contract
- Pagination: {{pagination}} (PaginationOption?) - Optional pagination parameters
`;

export const getContractStateTemplate = `
Extract contract state query parameters:
- Contract Address: {{contractAddress}} (string) - Address of the contract
- Pagination: {{pagination}} (PaginationOption?) - Optional pagination parameters
`;

export const getContractInfoTemplate = `
Extract contract info query parameters:
- Contract Address: {{contractAddress}} (string) - Address of the contract
`;

export const getContractHistoryTemplate = `
Extract contract history query parameters:
- Contract Address: {{contractAddress}} (string) - Address of the contract
`;

export const getSmartContractStateTemplate = `
Extract smart contract state query parameters:
- Contract Address: {{contractAddress}} (string) - Address of the contract
- Query: {{query}} (string | Record<string, any>?) - Optional query parameters
`;

export const getRawContractStateTemplate = `
Extract raw contract state query parameters:
- Contract Address: {{contractAddress}} (string) - Address of the contract
- Query: {{query}} (string?) - Optional raw query string
`;

export const getContractCodesTemplate = `
Extract contract codes query parameters:
- Pagination: {{pagination}} (PaginationOption?) - Optional pagination parameters
`;

export const getContractCodeTemplate = `
Extract contract code query parameters:
- Code ID: {{codeId}} (number) - Identifier of the contract code
`;

export const getContractCodeContractsTemplate = `
Extract contract code contracts query parameters:
- Code ID: {{codeId}} (number) - Identifier of the contract code
- Pagination: {{pagination}} (PaginationOption?) - Optional pagination parameters
`;

export const msgStoreCodeTemplate = `
Extract store code parameters:
- Wasm Bytes: {{wasmBytes}} (Uint8Array | string) - Contract bytecode
- Instantiate Permission: {{instantiatePermission}} (AccessConfig?) - Optional instantiation permissions
`;

export const msgUpdateAdminTemplate = `
Extract update admin parameters:
- New Admin: {{newAdmin}} (string) - Address of the new admin
- Contract: {{contract}} (string) - Address of the contract
`;

export const msgExecuteContractTemplate = `
Extract execute contract parameters:
- Funds: {{funds}} (object | object[]?) - Optional funds to send with execution
  - Denom: {{funds.denom}} (string) - Token denomination
  - Amount: {{funds.amount}} (string) - Amount value
- Sender: {{sender}} (string) - Address executing the contract
- Contract Address: {{contractAddress}} (string) - Address of the contract
- Exec Args: {{execArgs}} (ExecArgs?) - Optional execution arguments
- Exec: {{exec}} (object?) - Optional execution configuration
  - Msg: {{exec.msg}} (object) - Execution message
  - Action: {{exec.action}} (string) - Action to execute
- Msg: {{msg}} (object?) - Optional direct message
`;

export const msgMigrateContractTemplate = `
Extract migrate contract parameters:
- Contract: {{contract}} (string) - Address of the contract
- Code ID: {{codeId}} (number) - New code ID to migrate to
- Msg: {{msg}} (object) - Migration message
`;

export const msgInstantiateContractTemplate = `
Extract instantiate contract parameters:
- Admin: {{admin}} (string) - Address of the contract admin
- Code ID: {{codeId}} (number) - Code ID to instantiate
- Label: {{label}} (string) - Human readable contract label
- Msg: {{msg}} (Object) - Instantiation message
- Amount: {{amount}} (object?) - Optional funds to send
  - Denom: {{amount.denom}} (string) - Token denomination
  - Amount: {{amount.amount}} (string) - Amount value
`;

export const msgExecuteContractCompatTemplate = `
Extract execute contract compat parameters:
- Funds: {{funds}} (object | object[]?) - Optional funds to send
  - Denom: {{funds.denom}} (string) - Token denomination
  - Amount: {{funds.amount}} (string) - Amount value
- Contract Address: {{contractAddress}} (string) - Address of the contract
- Exec Args: {{execArgs}} (ExecArgs?) - Optional execution arguments
- Exec: {{exec}} (object?) - Optional execution configuration
  - Msg: {{exec.msg}} (Record<string, any>) - Execution message
  - Action: {{exec.action}} (string) - Action to execute
- Msg: {{msg}} (Record<string, any>?) - Optional direct message
`;

export const msgPrivilegedExecuteContractTemplate = `
Extract privileged execute contract parameters:
- Funds: {{funds}} (string) - Funds for privileged execution
- Contract Address: {{contractAddress}} (string) - Address of the contract
- Data: {{data}} (ExecPrivilegedArgs) - Privileged execution arguments
`;