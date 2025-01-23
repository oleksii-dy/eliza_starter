import { fetchEvmQuote } from "../scripts/fetchQuote";
import { ChainId, NativeToken } from "../constants";
import { arbitrumSigner } from "../network";
import { ethers } from "ethers";
import { IAaveDepositor } from "../abi/AaveDepositor";
import { approveIfRequired } from "../scripts/approveIfRequired";

async function main() {
  const aaveDepositorAddress = "0xDcBb658910b5192A43B79fD8244bDF27940d3B6b";
  const aavePoolAddress = "0x794a61358d6845594f94dc1db02a252b5b4814ad";
  const usdtTokenAddress = "0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9";

  // spending 0.0002 ETH
  const amount = "200000000000000";
  const srcToken = NativeToken;
  const destToken = usdtTokenAddress;
  const srcChain = ChainId.ARBITRUM_ONE;
  const destChain = ChainId.ARBITRUM_ONE;

  const AaveDepositorInterface = new ethers.Interface(IAaveDepositor);

  const externalCall = {
    type: 'evm',
    to: aaveDepositorAddress,
    data: AaveDepositorInterface.encodeFunctionData(
      'supply',
      [
        aavePoolAddress,
        usdtTokenAddress,
        // supplying on behalf of our wallet
        arbitrumSigner.address,
        // referralCode means no rewards will go to referral address
        0,
      ]
    ),
    allowFailure: true,
    // Our AaveDepositor contract expects that tokens will be transferred to it before call,
    // so we use TransferAndCall mode
    mode: 'transfer_and_call',
    // If supply call fails, our wallet on Arbitrum chain will receive the tokens
    fallbackAddress: arbitrumSigner.address,
  };

  const quote = await fetchEvmQuote({
    senderAddress: arbitrumSigner.address,
    amount,
    srcToken,
    destToken,
    srcChain,
    destChain,
    externalCall: JSON.stringify(externalCall),
    // sending tokens to Aave depositor
    destinationAddress: aaveDepositorAddress,
  });

  await approveIfRequired(arbitrumSigner, srcToken, quote.calldatas.to, amount);

  const swapTx = await arbitrumSigner.sendTransaction({
    to: quote.calldatas.to,
    data: quote.calldatas.data,
    value: quote.calldatas.value,
  });
  await swapTx.wait();
  console.log(`https://arbiscan.io/tx/${swapTx.hash}`);
}

main().then();