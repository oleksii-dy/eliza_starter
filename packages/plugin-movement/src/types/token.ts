interface Token {
    address: string;
    symbol: string;
    decimals: number;
    isNative?: boolean;
}

interface SwapParams {
    inputToken: Token;
    outputToken: Token;
    inputAmount: number | string;
    outputAmount: number | string;
}

const NATIVE_MOVE_ADDRESS = "0x1::aptos_coin::AptosCoin";

function getTokenTypeArgument(token: Token): string {
    if (token.isNative) {
        return NATIVE_MOVE_ADDRESS;
    }
    return token.address;
}

function formatTokenAmount(amount: number | string, decimals: number): string {
    const parsedAmount = typeof amount === 'string' ? parseInt(amount) : amount;
    return (parsedAmount * Math.pow(10, decimals)).toString();
}

export {
    Token,
    SwapParams,
    getTokenTypeArgument,
    formatTokenAmount,
    NATIVE_MOVE_ADDRESS
}; 