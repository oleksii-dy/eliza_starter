import { Action, IAgentRuntime, Memory, State } from "../types";
import { PrivyWalletProvider } from "../providers/privyWallet";

export const signPrivyMessageAction: Action = {
  name: "sign_privy_message",
  description: "Sign a message using a Privy server wallet",
  similes: [
    "create a digital signature",
    "sign data with Privy wallet",
    "authenticate a message",
    "cryptographically sign content"
  ],
  examples: [[
    {
      user: "user",
      content: {
        text: "Sign message 'Hello World' with my Privy wallet",
        action: "sign_privy_message"
      }
    },
    {
      user: "assistant",
      content: {
        text: "Message signed successfully!\nSignature: 0xabc...",
        action: "sign_privy_message"
      }
    }
  ]],
  validate: async (runtime: IAgentRuntime, message: Memory, state?: State) => {
    const required = ["walletId", "message"];
    return required.every(field => state && field in state);
  },
  handler: async (runtime: IAgentRuntime, message: Memory, state?: State) => {
    if (!state?.walletId || !state?.message) {
      throw new Error("Required parameters missing: walletId and message are required");
    }

    try {
      const provider = new PrivyWalletProvider(
        runtime.getSetting("PRIVY_APP_ID") || "",
        runtime.getSetting("PRIVY_APP_SECRET") || ""
      );

      const signature = await provider.signMessage(
        state.walletId,
        state.message,
        state.encoding || "utf-8"
      );

      return {
        text: `Message signed successfully!\nSignature: ${signature}`,
        data: { signature }
      };
    } catch (error) {
      console.error("Error signing message:", error);
      throw new Error("Failed to sign message. Please check the wallet ID and message.");
    }
  }
};

export default signPrivyMessageAction;
