import { NativeToken } from "../constants";
import { ethers } from "ethers";
import { IERC20_ABI } from "../abi/IERC20";
import { baseProvider } from "../network";

/**
 * Approves ERC20 tokens if allowance is too low
 * @param signer Transaction signer
 * @param srcToken Source token address
 * @param spender Spender address
 * @param amount Amount to be spent
 */
export async function approveIfRequired(
  signer: ethers.Wallet,
  srcToken: string,
  spender: string,
  amount: string,
) {
  if (srcToken !== NativeToken) {
    const TokenIn = new ethers.Contract(
      srcToken,
      IERC20_ABI,
      baseProvider,
    );
    const allowance: bigint = await TokenIn.allowance(
      signer.address,
      spender,
    );

    if (allowance < BigInt(amount)) {
      console.log(`Approving ${amount} tokens`);
      const approveTx = await TokenIn.approve(
        spender,
        amount,
      );

      await approveTx.wait();
    }
  }
}