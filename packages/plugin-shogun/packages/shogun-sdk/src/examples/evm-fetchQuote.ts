import { ethers } from "ethers";
import { ChainId, NativeToken } from "../constants";
import { DextraQuoteEstimation } from "../types";
import { fetchQuote } from "../scripts/fetchQuote";
import { formatStringEstimation } from "../scripts/formatting";

// Example token addresses
const TOKEN_ADDRESSES = {
    "ETH": NativeToken,
    "USDC": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // Base USDC
    "WETH": "0x4200000000000000000000000000000000000006",
    "LBTC": "0x8236a87084f8b84306f72007f36f2618a5634494",
    "cbBTC": "0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf" //coinbase BTC
};

const TOKEN_DECIMALS = {
    "ETH": 18,
    "USDC": 6,
    "WETH": 18,
    "LBTC": 8,
    "cbBTC": 8
};

const addressEVM = "0x95222290DD7278Aa3Ddd389Cc1E1d165CC4BAfe5"
const addressSOL = "5tzFkiKscXHK5ZXCGbXZxdw7gTjjD1mBwuoFbhUvuAi9"

const baseUSDC = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913"
const arbitrumUSDC = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831"
const arbitrumUSDT = "0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9"
const ethereumUSDT = "0xdAC17F958D2ee523a2206206994597C13D831ec7"
const solanaMOODENG = "ED5nyyWEzpPPiWimP8vYm7sD7TD3LAt3Q3gRTWHzPJBY"

const arbitrumAaveDepositorAddress = "0xDcBb658910b5192A43B79fD8244bDF27940d3B6b";
const arbitrumAavePoolAddress = "0x794a61358d6845594f94dc1db02a252b5b4814ad";

async function main() {
    const senderAddress = "0x95222290DD7278Aa3Ddd389Cc1E1d165CC4BAfe5";

    // Example 1: Simple quote ETH to USDC on Base
    const amount = ethers.utils.parseUnits("1", TOKEN_DECIMALS["ETH"]); // 1 ETH
    const quote: DextraQuoteEstimation = await fetchQuote({
        senderAddress,
        amount: amount.toString(),
        srcToken: TOKEN_ADDRESSES["ETH"],
        destToken: TOKEN_ADDRESSES["USDC"],
        srcChain: ChainId.BASE,
        destChain: ChainId.BASE,
    });

    console.log("1 ETH to USDC in Base:",
        formatStringEstimation(quote.outputAmount.value, quote.outputAmount.decimals),
        quote.outputAmount.symbol
    );

    // Example 2: Cross-chain quote with gas refuel
    const crossChainQuote: DextraQuoteEstimation = await fetchQuote({
        senderAddress,
        amount: amount.toString(),
        srcToken: TOKEN_ADDRESSES["ETH"],
        destToken: TOKEN_ADDRESSES["USDC"],
        srcChain: ChainId.BASE,
        destChain: ChainId.ARBITRUM_ONE,
        dstChainOrderAuthorityAddress: senderAddress,
        gasRefuel: ethers.utils.parseEther("0.01").toString()
    });

    console.log("1 ETH in Base to USDC in Arbitrum (with gas refuel):",
        formatStringEstimation(crossChainQuote.outputAmount.value, crossChainQuote.outputAmount.decimals),
        crossChainQuote.outputAmount.symbol
    );

    // Example 3: Quote with external call (AAVE deposit)
    const AaveDepositorInterface = new ethers.utils.Interface([
        {
            "inputs": [
                { "name": "pool", "type": "address" },
                { "name": "asset", "type": "address" },
                { "name": "onBehalfOf", "type": "address" },
                { "name": "referralCode", "type": "uint16" }
            ],
            "name": "supply",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        }
    ]);

    const externalCall = {
        type: 'evm',
        to: arbitrumAaveDepositorAddress,
        data: AaveDepositorInterface.encodeFunctionData('supply', [
            arbitrumAavePoolAddress,
            arbitrumUSDT,
            senderAddress,
            0,
        ]),
        allowFailure: true,
        mode: 'transfer_and_call',
        fallbackAddress: senderAddress,
    };

    const quoteWithExternalCall: DextraQuoteEstimation = await fetchQuote({
        senderAddress,
        amount: amount.toString(),
        srcToken: TOKEN_ADDRESSES["ETH"],
        destToken: arbitrumUSDT,
        srcChain: ChainId.ARBITRUM_ONE,
        destChain: ChainId.ARBITRUM_ONE,
        externalCall: JSON.stringify(externalCall),
    });

    console.log("1 ETH to USDT in Arbitrum with AAVE deposit:",
        formatStringEstimation(quoteWithExternalCall.outputAmount.value, quoteWithExternalCall.outputAmount.decimals),
        quoteWithExternalCall.outputAmount.symbol
    );
}

main().catch(console.error);