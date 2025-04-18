import { elizaLogger } from "@elizaos/core";
import {
  ActionExample,
  Content,
  HandlerCallback,
  IAgentRuntime,
  Memory,
  ModelClass,
  State,
  Action,
} from "@elizaos/core";
import { composeContext, generateObjectDeprecated } from "@elizaos/core";
import { getSeiAgentKit } from "../../client";
import { validateSeiConfig } from "../../environment";

type Address = `0x${string}`;

export interface TransferERC721Content extends Content {
  recipient: Address;
  tokenAddress: string;
  tokenId: number;
  amount: number;
}

/**
 * Validate that the content extracted from the LLM has the
 * correct properties to perform an ERC721 transfer.
 */
function isTransferERC721Content(
  _runtime: IAgentRuntime,
  content: any
): content is TransferERC721Content {
  return (
    typeof content.recipient === "string" &&
    typeof content.tokenAddress === "string" &&
    (typeof content.tokenId === "number") &&
    typeof content.amount === "number"
  );
}

/**
 * Prompt template that instructs the model to return a JSON block
 * with the fields we need for an ERC721 transfer. You can adapt
 * the instructions to your conversation style.
 */
const transferERC721Template = `Respond with a JSON markdown block containing only the extracted values. Use null for any fields that are not provided or cannot be determined.

Example response:
\`\`\`json
{
  "recipient": "0x111122223333444455556666777788889999AAAA",
  "tokenAddress": "0x5555BBBBccccDDDD111122223333444455556666",
  "tokenId": 123,
  "amount": 1
}
\`\`\`

{{recentMessages}}

The user wants to transfer an ERC721 (NFT). Extract:
- recipient: a valid address (0x... or sei...)
- tokenAddress: the contract address for the NFT (0x...)
- tokenId: the ID of the NFT (integer)
- amount: how many tokens to transfer (usually 1 for ERC721, but parse if user says otherwise)

If any field is missing, set it to null. Return only a JSON block, no extra text.`;


export const transferERC721Action: Action = {
  name: "TRANSFER_ERC721",
  similes: ["TRANSFER NFT", "SEND NFT", "TRANSFER ERC721", "SEND ERC721"],
  description: "Transfers an ERC721 (NFT) to a specified address",
  validate: async (runtime: IAgentRuntime): Promise<boolean> => {
    // Ensure we have all necessary config
    await validateSeiConfig(runtime);
    return true;
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State,
    _options: Record<string, unknown>,
    callback?: HandlerCallback
  ): Promise<boolean> => {
    elizaLogger.log("Starting ERC721 TRANSFER action...");

    // Acquire the configured agent kit
    const seiAgentKit = await getSeiAgentKit(runtime);

    // Initialize or update state
    if (!state) {
      state = (await runtime.composeState(message)) as State;
    } else {
      state = await runtime.updateRecentMessageState(state);
    }

    try {
      // Compose context for the LLM to parse user request into JSON
      const context = composeContext({
        state,
        template: transferERC721Template,
      });

      // Use the LLM to get structured data
      const content = await generateObjectDeprecated({
        runtime,
        context,
        modelClass: ModelClass.LARGE,
      });

      // Validate the structured data
      if (!isTransferERC721Content(runtime, content)) {
        elizaLogger.error("Invalid content for TRANSFER_ERC721 action.");
        if (callback) {
          callback({
            text: "Unable to process NFT transfer request. Missing or invalid details.",
            content: { error: "Invalid ERC721 transfer content" },
          });
        }
        return false;
      }

      // Attempt the on-chain transfer
      const tokenIdBigInt = BigInt(content.tokenId);
      const amountBigInt = BigInt(content.amount);
      const txResult = await seiAgentKit.ERC721Transfer(
        amountBigInt.toString(),
        content.recipient as Address,
        content.tokenAddress as Address,
        tokenIdBigInt.toString()  
      );

      // If empty string, it indicates an error was logged in the tool
      if (!txResult) {
        elizaLogger.error("Transaction not confirmed. Possibly failed or invalid data.");
        if (callback) {
          callback({
            text: "Error: NFT transfer not completed. Please check details or try again.",
          });
        }
        return false;
      }

      // All good — respond with success
      elizaLogger.success("Successfully transferred the NFT.");
      if (callback) {
        callback({
          text: txResult,
        });
      }

      return true;
    } catch (error) {
      elizaLogger.error("Error transferring the NFT", error);
      if (callback) {
        callback({
          text: "Error transferring the NFT.",
          content: { error: "Error transferring NFT" },
        });
      }
      return false;
    }
  },

  // Example interactions for testing and documentation
  examples: [
    [
      {
        user: "{{user}}",
        content: {
          text: "Transfer 1 NFT with tokenId 555 from contract 0xFAcC... to 0x1111... right now",
        },
      },
      {
        user: "{{agent}}",
        content: {
          text: "Sure! I'm preparing the NFT transfer details...",
        },
      },
      {
        user: "{{agent}}",
        content: {
          text: "Successfully transferred 1 NFT with ID 555 to 0x1111.... Transaction hash: 0xABCDEF...",
        },
      },
    ],
  ] as ActionExample[][],
};
