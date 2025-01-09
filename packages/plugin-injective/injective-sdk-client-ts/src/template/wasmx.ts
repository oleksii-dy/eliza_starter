// wasmx-templates.ts
export const getWasmxParamsTemplate = `
Extract wasmx parameters query:
- Returns the current wasmx module parameters
`;

export const getContractRegistrationInfoTemplate = `
Extract contract registration info query parameters:
- Contract Address: {{contractAddress}} (string) - Address of the registered contract
`;

export const getRegisteredContractsTemplate = `
Extract registered contracts query parameters:
- Pagination: {{pagination}} (PaginationOption?) - Optional pagination parameters
`;

export const msgRegisterContractTemplate = `
Extract contract registration parameters:
- Contract Address: {{contractAddress}} (string) - Address of the contract to register
- GasLimit: {{gasLimit}} (number) - Maximum gas allowed per execution
- GasPrice: {{gasPrice}} (string) - Gas price for contract execution
- Pin Contract: {{pinContract}} (boolean) - Whether to pin contract in memory
- Funds: {{funds}} (object[]?) - Optional funds configuration
  - Denom: {{funds.denom}} (string) - Token denomination
  - Amount: {{funds.amount}} (string) - Token amount
`;

export const msgDeregisterContractTemplate = `
Extract contract deregistration parameters:
- Contract Address: {{contractAddress}} (string) - Address of the contract to deregister
`;

export const msgUpdateContractTemplate = `
Extract contract update parameters:
- Contract Address: {{contractAddress}} (string) - Address of the contract
- GasLimit: {{gasLimit}} (number?) - Optional new gas limit
- GasPrice: {{gasPrice}} (string?) - Optional new gas price
- Pin Contract: {{pinContract}} (boolean?) - Optional pin status update
`;

export const msgSetContractGasLimitTemplate = `
Extract contract gas limit update parameters:
- Contract Addresses: {{contractAddresses}} (string[]) - Array of contract addresses
- Gas Limit: {{gasLimit}} (number) - New gas limit for contracts
`;

export const msgExecuteContractCompilerTemplate = `
Extract contract compilation execution parameters:
- Contract Address: {{contractAddress}} (string) - Address of the contract
- Compiler: {{compiler}} (string) - Compiler version/type
- Input: {{input}} (string) - Input data for compilation
- Settings: {{settings}} (object?) - Optional compiler settings
  - Optimize: {{settings.optimize}} (boolean?) - Enable optimization
  - Debug: {{settings.debug}} (boolean?) - Include debug information
`;

export const msgUpdateParamsTemplate = `
Extract params update parameters:
- Authority: {{authority}} (string) - Address with authority to update params
- Params: {{params}} (object) - Updated parameters
  - MaxContractSize: {{params.maxContractSize}} (number) - Maximum contract size in bytes
  - MaxGasPerTx: {{params.maxGasPerTx}} (number) - Maximum gas per transaction
  - MaxContractGas: {{params.maxContractGas}} (number) - Maximum gas per contract
  - MaxContractMaxGas: {{params.maxContractMaxGas}} (number) - Maximum allowed gas limit
  - MinGasPrice: {{params.minGasPrice}} (string) - Minimum gas price
  - MaxPinnedCodes: {{params.maxPinnedCodes}} (number) - Maximum number of pinned codes
`;

export const msgPinCodesTemplate = `
Extract code pinning parameters:
- Code IDs: {{codeIds}} (number[]) - Array of code IDs to pin
- Authority: {{authority}} (string) - Address with authority to pin codes
`;

export const msgUnpinCodesTemplate = `
Extract code unpinning parameters:
- Code IDs: {{codeIds}} (number[]) - Array of code IDs to unpin
- Authority: {{authority}} (string) - Address with authority to unpin codes
`;

export const msgSetExecutorParamsTemplate = `
Extract executor params update parameters:
- Authority: {{authority}} (string) - Address with authority to update params
- Params: {{params}} (object) - Executor parameters
  - MaxBlockGas: {{params.maxBlockGas}} (number) - Maximum gas per block
  - MaxCallDepth: {{params.maxCallDepth}} (number) - Maximum contract call depth
  - StackSize: {{params.stackSize}} (number) - Execution stack size
  - MemoryLimit: {{params.memoryLimit}} (number) - Memory limit in bytes
`;