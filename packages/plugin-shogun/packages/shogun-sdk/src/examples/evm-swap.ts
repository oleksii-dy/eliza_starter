import { ethers } from "ethers";
import { fetchEvmQuote } from "../scripts/fetchQuote";
import { ChainId, NativeToken } from "../constants";
import { approveIfRequired } from "../scripts/approveIfRequired";
import { formatStringEstimation } from "../scripts/formatting";

const TOKEN_ADDRESSES = {
    "ETH": NativeToken,
    "USDC": "0x833589fCD6eDb6E08f4c7C32D4f71b54bda02913", // Base USDC
    "WETH": "0x4200000000000000000000000000000000000006"
};

const TOKEN_DECIMALS = {
    "ETH": 18,
    "USDC": 6,
    "WETH": 18
};

async function main() {
    // Setup wallet
    if (!process.env.PRIVATE_KEY) {
        throw new Error("PRIVATE_KEY environment variable is required");
    }

    const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

    // Swap parameters
    const srcToken = TOKEN_ADDRESSES["ETH"];
    const destToken = TOKEN_ADDRESSES["USDC"];
    const amount = ethers.utils.parseEther("0.0001"); // 0.0001 ETH

    // Fetch quote
    const quote = await fetchEvmQuote({
        senderAddress: wallet.address,
        amount: amount.toString(),
        srcToken,
        destToken,
        srcChain: ChainId.BASE,
        destChain: ChainId.BASE,
    });

    console.log(`Expected to receive: ${
        formatStringEstimation(quote.outputAmount.value, quote.outputAmount.decimals)
    } ${quote.outputAmount.symbol}`);

    // Approve tokens if needed
    await approveIfRequired(wallet, srcToken, quote.calldatas.to, amount.toString());

    // Execute swap
    const swapTx = await wallet.sendTransaction({
        to: quote.calldatas.to,
        data: quote.calldatas.data,
        value: quote.calldatas.value,
    });

    console.log("Swap transaction sent:", swapTx.hash);

    // Wait for confirmation
    const receipt = await swapTx.wait();
    console.log("Swap confirmed in block:", receipt.blockNumber);
    console.log(`Transaction: https://basescan.org/tx/${swapTx.hash}`);
}

main().catch(console.error);