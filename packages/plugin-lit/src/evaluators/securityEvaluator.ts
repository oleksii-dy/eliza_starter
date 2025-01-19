import { Evaluator, IAgentRuntime, Memory, State } from "@elizaos/core";
import { LitState } from "../providers/litProvider";

interface TransactionRequest {
  to: string;
  amount: string;
  chainId?: number;
  data?: string;
  nonce?: number;
}

interface SecurityEvalResult {
  status: "approved" | "rejected";
  reason: string;
  txHash?: string;
}

export const securityEvaluator: Evaluator = {
  name: "SECURITY_EVALUATOR",
  description: "Validates transaction safety and trust levels before signing",
  similes: ["Transaction Guard", "Security Validator", "Trust Checker"],
  alwaysRun: true,

  validate: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State & { lit?: LitState }
  ): Promise<boolean> => {
    // Skip if no transaction request or if it's a system message
    if (message.content?.system || !message.content?.transactionRequest) {
      return false;
    }

    // Ensure we have a valid PKP before proceeding
    if (!state?.lit?.pkp?.publicKey) {
      console.warn("[securityEvaluator] No valid PKP found");
      return false;
    }

    const tx = message.content.transactionRequest as TransactionRequest;
    
    // Basic validation checks
    try {
      // Validate amount
      const amount = parseFloat(tx.amount);
      if (isNaN(amount) || amount <= 0) {
        console.warn("[securityEvaluator] Invalid transaction amount");
        return false;
      }

      // Add additional validation as needed
      // e.g., chainId validation, address validation, etc.

      return true;
    } catch (error) {
      console.error("[securityEvaluator] Validation error:", error);
      return false;
    }
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State & { lit?: LitState }
  ): Promise<SecurityEvalResult> => {
    const tx = message.content.transactionRequest as TransactionRequest;
    
    try {
      // Trust level checks
      const amount = parseFloat(tx.amount);
      const maxAllowed = 1.0; // 1 ETH limit
      
      if (amount > maxAllowed) {
        return {
          status: "rejected",
          reason: `Transaction amount ${amount} exceeds maximum allowed (${maxAllowed} ETH)`
        };
      }

      // Execute the SEND_ETH action
      const response: Memory[] = [];
      await runtime.processActions(
        {
          ...message,
          content: {
            text: `Sending ${tx.amount} ETH to ${tx.to}`,
            action: "SEND_ETH",
            to: tx.to,
            amount: tx.amount,
            chainId: tx.chainId
          }
        },
        response
      );

      if (!response.length) {
        throw new Error("Transaction signing failed");
      }

      const txHash = response[0].content?.txHash;
      
      // Log successful transaction
      console.log("[securityEvaluator] Transaction signed successfully:", txHash);

      return {
        status: "approved",
        reason: "Transaction within trust limits",
        txHash: typeof txHash === 'string' ? txHash : undefined
      };

    } catch (error) {
      console.error("[securityEvaluator] Transaction failed:", error);
      return {
        status: "rejected",
        reason: `Transaction failed: ${error.message}`
      };
    }
  },

  examples: [
    {
      context: "Valid transaction within limits",
      messages: [{
        user: "{{user1}}",
        content: {
          text: "Send 0.5 ETH to 0x123...",
          transactionRequest: {
            to: "0x123...",
            amount: "0.5",
            chainId: 1
          }
        }
      }],
      outcome: "Transaction approved and signed successfully"
    },
    {
      context: "Transaction exceeding trust limits",
      messages: [{
        user: "{{user1}}",
        content: {
          text: "Send 2.0 ETH to 0x456...",
          transactionRequest: {
            to: "0x456...",
            amount: "2.0",
            chainId: 1
          }
        }
      }],
      outcome: "Transaction rejected due to amount exceeding trust limits"
    }
  ]
}; 