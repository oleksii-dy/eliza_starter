import {
    type ActionExample,
    type HandlerCallback,
    type IAgentRuntime,
    type Memory,
    ModelClass,
    type State,
    composeContext,
    elizaLogger,
    generateObject,
    type Action,
} from "@elizaos/core";
import { RoochHTTPTransport, getRoochNodeUrl, NetworkType } from "@roochnetwork/rooch-sdk/dist/esm";
import { z } from "zod";
import { assetsProvider } from "../../providers/assetsProvider";
import { TransferService } from '../../services/transfer';
import { transferTemplate } from './constants';
import { TransferContent } from './types';

const transferSchema = z.object({
    recipient: z.string(),
    amount: z.union([z.string(), z.number()]),
    symbol: z.string().optional(),
    index: z.number().positive().optional(),
});

export default {
    name: "SEND_COIN",
    similes: ["TRANSFER_COIN", "TRANSFER_COINS", "SEND_COINS", "PAY"],
    validate: async (runtime: IAgentRuntime, message: Memory) => {
        return true;
    },
    description: "Transfer coins from the agent's wallet to another address",
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        options: { [key: string]: unknown },
        callback?: HandlerCallback
      ): Promise<boolean> => {
        elizaLogger.log("Starting Rooch SEND_COIN handler...");

        const network = runtime.getSetting("ROOCH_NETWORK") as NetworkType;
        const transport = new RoochHTTPTransport({
            url: getRoochNodeUrl(network)
        });

        const transferService = new TransferService(
          assetsProvider,
          runtime,
          transport
        );

        if (!state) {
          state = (await runtime.composeState(message)) as State;
        } else {
          state = await runtime.updateRecentMessageState(state);
        }

        try {
          const transferContext = composeContext({
            state,
            template: transferTemplate,
          });

          const content = await generateObject({
            runtime,
            context: transferContext,
            schema: transferSchema,
            modelClass: ModelClass.SMALL,
          });

          const transferContent = content.object as TransferContent;

          const result = await transferService.transfer({
            recipient: transferContent.recipient,
            amount: transferContent.amount,
            symbol: transferContent.symbol,
            index: transferContent.index,
          });

          if (callback) {
            if (result.success) {
              callback({
                text: `Successfully transferred ${transferContent.amount} ${transferContent.symbol || 'RGAS'} to ${transferContent.recipient}`,
                content: {
                  success: true,
                  amount: transferContent.amount,
                  recipient: transferContent.recipient,
                  symbol: transferContent.symbol || 'RGAS',
                },
              });
            } else {
              callback({
                text: `Error transferring coins: ${result.error}`,
                content: { error: result.error },
              });
            }
          }

          return result.success;
        } catch (error) {
          console.error("Error during coin transfer:", error);
          if (callback) {
            callback({
              text: `Error transferring coins: ${error.message}`,
              content: { error: error.message },
            });
          }
          return false;
        }
    },

    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Send 1 RGAS to 0x4f2e63be8e7fe287836e29cde6f3d5cbc96eefd0c0e3f3747668faa2ae7324b0",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "I'll send 1 RGAS now...",
                    action: "SEND_COIN",
                },
            },
        ],
    ] as ActionExample[][],
} as Action;