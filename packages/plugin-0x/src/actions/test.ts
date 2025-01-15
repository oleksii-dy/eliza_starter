import { createClientV2 } from "@0x/swap-ts-sdk";

async function main() {
    const zxClient = createClientV2({
        apiKey: "a0961ebe-ff75-4c46-9b77-0f4fef85f6d1",
    });

    try {
        const price = await zxClient.swap.permit2.getPrice.query({
            buyToken: "0x6b175474e89094c44da98b954eedeac495271d0f", // WETH
            sellToken: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2", // USDT
            sellAmount: "100000000000000000000",
            chainId: 1,
        });

        console.log("Price:", price);
    } catch (error) {
        console.error("Error:", error);
    }

    try {
        const quote = await zxClient.swap.permit2.getQuote.query({
            buyToken: "0x6b175474e89094c44da98b954eedeac495271d0f",
            sellToken: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
            sellAmount: "100000000000000000000",
            chainId: 1,
            taker: "0x04a51B7Bec8f7c6b48Fb90E327CFaCd9B04Ac237", // Public wallet address. Required here because it checks allowances, balances, etc.
        });
        console.log("Quote:", quote);
    } catch (error) {
        console.error("Error:", error);
    }
}

main();
// pnpm tsx packages/plugin-0x/src/actions/test.ts
