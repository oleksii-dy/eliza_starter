export interface SymbiosisToken {
    chainId: number;
    address: string;
    symbol: string;
    decimals: number;
}

export interface SymbiosisTokenIn extends SymbiosisToken {
    amount: string;
}

export interface SymbiosisSwapRequest {
    tokenAmountIn: SymbiosisTokenIn;
    tokenOut: SymbiosisToken;
    from: string;
    to: string;
    slippage: number;
}

export interface SymbiosisSwapResponse {
    fee: Fee;
    route: Route[];
    inTradeType: string;
    outTradeType: string;
    fees: Fee2[];
    routes: Route2[];
    kind: string;
    priceImpact: string;
    tokenAmountOut: TokenAmountOut;
    tokenAmountOutMin: TokenAmountOutMin;
    amountInUsd: AmountInUsd;
    approveTo: string;
    type: string;
    rewards: unknown[];
    estimatedTime: number;
    tx: Tx;
}

export interface Fee {
    symbol: string;
    icon: string;
    address: string;
    amount: string;
    chainId: number;
    decimals: number;
}
