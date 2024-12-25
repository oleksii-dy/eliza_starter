import { Action, IAgentRuntime, Memory, State } from "../types";
import { PrivyWalletProvider } from "../providers/privyWallet";

export const createPrivyWalletAction: Action = {
  name: "create_privy_wallet",
  description: "Creates a new Privy server wallet for secure blockchain transactions",
  similes: [
    "start a Privy wallet",
    "build a new secure wallet",
    "initialize a blockchain wallet",
    "create a new crypto wallet"
  ],
  examples: [[
    {
      user: "user",
      content: {
        text: "Create a new Privy wallet for Ethereum",
        action: "create_privy_wallet"
      }
    },
    {
      user: "assistant",
      content: {
        text: "Created new Privy wallet on ethereum:\nWallet ID: prw_123\nAddress: 0x123...",
        action: "create_privy_wallet"
      }
    }
  ]],
  validate: async () => true,
  handler: async (runtime: IAgentRuntime, message: Memory, state?: State) => {
    try {
      const provider = new PrivyWalletProvider(
        runtime.getSetting("PRIVY_APP_ID") || "",
        runtime.getSetting("PRIVY_APP_SECRET") || ""
      );
      
      // Default to ethereum, but allow override through state
      const chainType = (state?.chainType as "ethereum" | "solana") || "ethereum";
      const wallet = await provider.createWallet(chainType);
      
      return {
        text: `Created new Privy wallet on ${chainType}:\nWallet ID: ${wallet.id}\nAddress: ${wallet.address}`,
        data: wallet
      };
    } catch (error) {
      console.error("Error creating Privy wallet:", error);
      throw new Error("Failed to create Privy wallet. Please ensure PRIVY_APP_ID and PRIVY_APP_SECRET are set correctly.");
    }
  }
};

export default createPrivyWalletAction;
