import { Action, IAgentRuntime, Memory, State } from "../types";
import { PrivyWalletProvider } from "../providers/privyWallet";

export const sendPrivyTransactionAction: Action = {
  name: "send_privy_transaction",
  description: "Send a transaction using a Privy server wallet",
  similes: [
    "transfer funds with Privy",
    "send crypto using Privy wallet",
    "make a blockchain transaction",
    "transfer tokens securely"
  ],
  examples: [[
    {
      user: "user",
      content: {
        text: "Send 1 ETH to 0x456...",
        action: "send_privy_transaction"
      }
    },
    {
      user: "assistant",
      content: {
        text: "Transaction sent successfully!\nSigned Transaction: 0x789...",
        action: "send_privy_transaction"
      }
    }
  ]],
  validate: async (runtime: IAgentRuntime, message: Memory, state?: State) => {
    const required = ["walletId", "to", "value"];
    return required.every(field => state && field in state);
  },
  handler: async (runtime: IAgentRuntime, message: Memory, state?: State) => {
    if (!state?.walletId || !state?.to || !state?.value) {
      throw new Error("Required parameters missing: walletId, to, and value are required");
    }

    try {
      const provider = new PrivyWalletProvider(
        runtime.getSetting("PRIVY_APP_ID") || "",
        runtime.getSetting("PRIVY_APP_SECRET") || ""
      );

      const transaction = await provider.sendTransaction(state.walletId, {
        to: state.to,
        value: state.value,
        chainId: state.chainId,
        idempotencyKey: state.idempotencyKey
      });

      return {
        text: `Transaction sent successfully!\nSigned Transaction: ${transaction.signedTransaction}`,
        data: transaction
      };
    } catch (error) {
      console.error("Error sending transaction:", error);
      throw new Error("Failed to send transaction. Please check the wallet ID and transaction details.");
    }
  }
};

export default sendPrivyTransactionAction;
