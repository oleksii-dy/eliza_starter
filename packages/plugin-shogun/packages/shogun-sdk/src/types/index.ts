import { EvmEstimation } from "./evm";

export type DextraQuoteEstimation = EvmEstimation;

export type QuoteQueryParams = {
  srcToken: string,
  destToken: string,
  amount: string,
  senderAddress: string,
  srcChain: string,
  destChain: string,
  slippage?: string,
  gasRefuel?: string,
  srcChainOrderAuthorityAddress?: string,
  dstChainOrderAuthorityAddress?: string,
  dstChainBridgeFallbackAddress?: string,
  destinationAddress?: string,
  affiliateWallet?: string,
  affiliateFee?: string,
  externalCall?: string,
}