export type EvmEstimation = {
  routes: {
    path?: string[],
    amountIn: TokenData,
    amountOut: TokenData,
  }[],
  inputAmount: TokenData,
  outputAmount: TokenData & { receiver: string },
  calldatas: {
    chainId: number,
    from: string,
    data: string,
    to: string,
    value: string,
  },
  gasRefuel?: string,
  swapFee?: TokenFeeData,
  bridgeFee?: TokenFeeData,
  affiliateFee?: {
    receiver: string,
    feeToken: string,
    feeAmount: string,
  }
};

export type TokenData = {
  address: string,
  decimals: number,
  chainId: number,
  name: string,
  symbol: string,
  value: string,
}

export type TokenFeeData = {
  token: string,
  amount: string,
  chainId: number,
}