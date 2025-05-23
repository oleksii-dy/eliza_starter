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

export interface MintERC721Content extends Content {
  recipient: Address;
  tokenAddress: Address;
  tokenId: string | number;
}

/**
 * Simple type guard to validate the parsed JSON structure.
 */
function isMintERC721Content(
  _runtime: IAgentRuntime,
  content: any
): content is MintERC721Content {
  return (
    typeof content.recipient === "string" &&
    typeof content.tokenAddress === "string" &&
    (typeof content.tokenId === "number")
  );
}

/**
 * Prompt template: instructs the LLM to extract only
 * the fields we need (recipient, tokenAddress, tokenId)
 * for minting a new ERC721 (NFT).
 */
const mintERC721Template = `Respond with a JSON markdown block containing only the extracted values. Use null for any fields that are not provided or cannot be determined.

Example response:
\`\`\`json
{
  "recipient": "0x111122223333444455556666777788889999AAAA",
  "tokenAddress": "0x5555BBBBccccDDDD111122223333444455556666",
  "tokenId": 1234
}
\`\`\`

{{recentMessages}}

The user wants to mint a new NFT on an ERC721 contract. Extract:
- recipient: a valid address (0x... or sei...)
- tokenAddress: the contract address for the NFT (0x...)
- tokenId: the ID of the NFT (integer)

If any field is missing, set it to null. Return only a JSON block, no extra text.
`;

export const mintERC721Action: Action = {
  name: "MINT_ERC721",
  similes: ["MINT NFT", "MINT ERC721", "CREATE NFT", "GENERATE NFT"],
  description: "Mints an ERC721 (NFT) to a specified address",
  validate: async (runtime: IAgentRuntime): Promise<boolean> => {
    // Ensure we have all necessary config (e.g., private keys, chain config)
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
    elizaLogger.log("Starting ERC721 MINT action...");

    // Acquire the agent kit to perform on-chain ops
    const seiAgentKit = await getSeiAgentKit(runtime);

    // Initialize or update State
    if (!state) {
      state = (await runtime.composeState(message)) as State;
    } else {
      state = await runtime.updateRecentMessageState(state);
    }

    try {
      // Compose context for LLM to parse user request into structured JSON
      const context = composeContext({
        state,
        template: mintERC721Template,
      });

      // Ask the LLM to produce only JSON with the needed fields
      const content = await generateObjectDeprecated({
        runtime,
        context,
        modelClass: ModelClass.LARGE,
      });

      // Validate the extracted JSON
      if (!isMintERC721Content(runtime, content)) {
        elizaLogger.error("Invalid content for MINT_ERC721 action.");
        if (callback) {
          callback({
            text: "Unable to process NFT mint request. Missing or invalid details.",
            content: { error: "Invalid mint content" },
          });
        }
        return false;
      }

      // Convert tokenId to BigInt; typical for on-chain calls
      const tokenIdBigInt = BigInt(content.tokenId);

      // Perform the ERC721 mint
      const mintedMessage = await seiAgentKit.ERC721Mint(
        content.recipient as Address,
        content.tokenAddress as Address,
        tokenIdBigInt
      );

      if (!mintedMessage) {
        // Returned empty string => indicates error or revert
        elizaLogger.error("Transaction not confirmed. Possibly failed or invalid data.");
        if (callback) {
          callback({
            text: "Error: NFT mint not completed. Check contract address or try again.",
          });
        }
        return false;
      }

      // Transaction successful
      elizaLogger.success("Successfully minted the NFT.");
      if (callback) {
        callback({
          text: mintedMessage,
        });
      }
      return true;
    } catch (error) {
      elizaLogger.error("Error minting the NFT", error);
      if (callback) {
        callback({
          text: "Error minting the NFT.",
          content: { error: "Error minting NFT" },
        });
      }
      return false;
    }
  },

  examples: [
    [
      {
        user: "{{user}}",
        content: {
          text: "Mint NFT with ID 555 for address 0x1111... from the contract 0xFaCC...",
        },
      },
      {
        user: "{{agent}}",
        content: {
          text: "Sure! I'm preparing the NFT mint details...",
        },
      },
      {
        user: "{{agent}}",
        content: {
          text: "Successfully minted NFT with ID 555 to 0x1111.... Transaction hash: 0xABCDEF...",
        },
      },
    ],
  ] as ActionExample[][],
};
