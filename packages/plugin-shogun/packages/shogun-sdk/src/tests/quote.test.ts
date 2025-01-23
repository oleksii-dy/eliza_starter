import { expect, test } from 'vitest';
import { fetchEvmQuote } from '../scripts/fetchQuote';
import { ChainId } from '../constants';
import { ethers } from 'ethers';

test('fetch evm quote', async () => {
  const testWallet = ethers.Wallet.createRandom();

  const params = {
    senderAddress: testWallet.address,
    amount: ethers.utils.parseEther("0.001").toString(), // 0.001 ETH
    srcToken: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee", // ETH
    destToken: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // USDC on Base
    srcChain: ChainId.BASE,
    destChain: ChainId.BASE,
    slippage: "1.5",
  };

  console.log('Test params:', {
    ...params,
    senderAddress: `${params.senderAddress.slice(0, 6)}...${params.senderAddress.slice(-6)}`
  });

  const quote = await fetchEvmQuote(params);

  expect(quote).toBeDefined();
  expect(quote.outputAmount).toBeDefined();
  expect(quote.outputAmount.symbol).toBe('USDC');
});