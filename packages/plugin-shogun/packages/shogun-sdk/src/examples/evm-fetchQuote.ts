import { ethers } from "ethers";
import { ChainId, NativeToken } from "../constants";
import { DextraQuoteEstimation } from "../types";
import { fetchQuote } from "../scripts/fetchQuote";

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
  let estimation: DextraQuoteEstimation;
  estimation = await fetchQuote({
    senderAddress: addressEVM,
    amount: "1000000000000000000", // 1ETH
    srcToken: NativeToken,
    destToken: baseUSDC,
    srcChain: ChainId.BASE,
    destChain: ChainId.BASE,
  });
  console.log("1 ETH to USDC in Base", estimation?.outputAmount);

  estimation = await fetchQuote({
    senderAddress: addressEVM,
    amount: "1000000000000000000", // 1ETH
    srcToken: NativeToken,
    destToken: arbitrumUSDC,
    srcChain: ChainId.BASE,
    destChain: ChainId.ARBITRUM_ONE,
    dstChainOrderAuthorityAddress: addressEVM, // (usually, a user wallet's address) on the destination chain who is authorised to patch and cancel the order.
    gasRefuel: "10000000000000000" // 0.01ETH Bridge-only param for funding destination address with native tokens of destination chain.
  });
  console.log("1 ETH in Base to USDC in Arbitrum with additional 0.01ETH in the destination chain (Arbitrum) that can be used as gas", estimation?.outputAmount);

  estimation = await fetchQuote({
    senderAddress: addressEVM,
    amount: "1000000000000000000", // 1ETH
    srcToken: NativeToken,
    destToken: NativeToken, // BNB
    srcChain: ChainId.BASE,
    destChain: ChainId.BSC,
    dstChainOrderAuthorityAddress: addressEVM
  });
  console.log("1 ETH in Base to BNB in Binance Smart Chain", estimation?.outputAmount);

  estimation = await fetchQuote({
    senderAddress: addressEVM,
    destinationAddress: addressSOL,
    amount: "100000000", // 100USDC
    srcToken: baseUSDC,
    destToken: solanaMOODENG,
    srcChain: ChainId.BASE,
    destChain: ChainId.SOLANA,
    gasRefuel: "10000000000000000", // 0.01ETH worth of SOL ~ 0.14969862280503093 SOL
    dstChainOrderAuthorityAddress: addressSOL
  });
  console.log("100 USDC in Base to MOODENG in Solana with 1000", estimation?.outputAmount);

  estimation = await fetchQuote({
    senderAddress: addressEVM,
    amount: "100000000", // 100USDC
    srcToken: arbitrumUSDC,
    destToken: ethereumUSDT,
    srcChain: ChainId.ARBITRUM_ONE,
    destChain: ChainId.ETHEREUM,
    dstChainOrderAuthorityAddress: addressEVM,
    affiliateFee: "2", // 2% of affiliate fee, means 2 USDC goes to the affiliateWallet and 98% will be used to swap
    affiliateWallet: addressEVM, // could be any wallet address
  });
  console.log("100 USDC in Arbitrum to USDT in Ethereum with 2% affiliate fee, (only 98USDC will be swapped to USDT)", estimation?.outputAmount);

  // External call example
  const AaveDepositorInterface = [
    {
      "constant": false,
      "inputs": [
        {
          "name": "pool",
          "type": "address"
        },
        {
          "name": "asset",
          "type": "address"
        },
        {
          "name": "onBehalfOf",
          "type": "address"
        },
        {
          "name": "referralCode",
          "type": "uint16"
        }
      ],
      "name": "supply",
      "outputs": [],
      "payable": false,
      "stateMutability": "nonpayable",
      "type": "function"
    }
  ];
  const AaveDepositorContract = new ethers.Interface(AaveDepositorInterface);



  const externalCall = {
    type: 'evm',
    to: arbitrumAaveDepositorAddress,
    data: AaveDepositorContract.encodeFunctionData(
        'supply',
        [
          arbitrumAavePoolAddress,
          arbitrumUSDT,
          // supplying on behalf of our wallet
          addressEVM,
          // referralCode means no rewards will go to referral address
          0,
        ]
    ),
    allowFailure: true,
    // Our AaveDepositor contract expects that tokens will be transferred to it before call,
    // so we use TransferAndCall mode
    mode: 'transfer_and_call',
    // If supply call fails, our wallet on Arbitrum chain will receive the tokens
    fallbackAddress: addressEVM,
  }

  estimation = await fetchQuote({
    senderAddress: addressEVM,
    amount: "1000000000000000000", // 1ETH
    srcToken: NativeToken,
    destToken: arbitrumUSDT,
    srcChain: ChainId.ARBITRUM_ONE,
    destChain: ChainId.ARBITRUM_ONE,
    externalCall: JSON.stringify(externalCall),
  });
  console.log("1 ETH in Arbitrum to USDT in Ethereum with external call that deposits all the available swap tokens to AAVE pool", estimation);
}

main();