import { Action, ActionExample, composeContext, elizaLogger, generateObject, HandlerCallback, IAgentRuntime, Memory, ModelClass, State } from "@elizaos/core";
import { AgentSDK, VerifyParams } from "ai-agent-sdk-js";
import { verifyDataTemplate } from "../templates";
import { isVerifyParams, VerifyParamsSchema } from "../types";

export const verifyData: Action = {
  name: "VERIFY",
  similes: [
    'VERIFY_DATA',
  ],
  description: "verify data",
  validate: async (runtime: IAgentRuntime, message: Memory) => {
    return true;
  },
  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    _options?: { [key: string]: unknown },
    callback?: HandlerCallback
  ) => {
    elizaLogger.info("Composing state for message:", message.content.text);
    if (!state) {
    state = (await runtime.composeState(message)) as State;
    } else {
    state = await runtime.updateRecentMessageState(state);
    }

    const context = composeContext({
        state,
        template: verifyDataTemplate,
    });

    let verifyParams: VerifyParams;
    try {
        const response = await generateObject({
            runtime,
            context,
            modelClass: ModelClass.LARGE,
            schema: VerifyParamsSchema,
        });

        verifyParams = response.object as VerifyParams;
        if (!isVerifyParams(verifyParams)) {
            throw new Error();
        }

        elizaLogger.info('verify params received:', verifyParams);
    }  catch (error: any) {
        elizaLogger.error('Invalid content: ', verifyParams ? JSON.stringify(verifyParams) : null, error);
        callback({ text: 'Cannot verify data because of invalid content: ' + verifyParams ? JSON.stringify(verifyParams) : null });
        return;
    }

    try {
        const agent = new AgentSDK({
            proxyAddress: runtime.getSetting('APRO_PROXY_ADDRESS') ?? process.env.APRO_PROXY_ADDRESS,
            rpcUrl: runtime.getSetting('APRO_RPC_URL') ?? process.env.APRO_RPC_URL,
            privateKey: runtime.getSetting('APRO_PRIVATE_KEY') ?? process.env.APRO_PRIVATE_KEY,
            autoHashData: (runtime.getSetting('APRO_AUTO_HASH_DATA') ?? process.env.APRO_AUTO_HASH_DATA) === 'true',
            converterAddress: runtime.getSetting('APRO_CONVERTER_ADDRESS') ?? process.env.APRO_CONVERTER_ADDRESS,
        });

        const tx = await agent.verify(verifyParams)
        elizaLogger.log(`Transaction ID: ${tx.hash}`);

        const receipt = await tx.wait();
        elizaLogger.log(`Data verified successfully. Transaction ID: ${receipt.hash}`);

        callback(
            {
                text: 'Success: Data verified successfully. Transaction ID: ' + receipt.hash,
            }
        )
    } catch (error: any) {
        elizaLogger.error(`Error verify data: ${error.message}`);
        callback(
            {
                text: 'Error verifying data: ' + error.message,
            }
        )
    }
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: {
          text: "I want to verify data:",
        },
      },
      {
        user: "{{agentName}}",
        content: {
          text: "Verifying data...",
          action: "VERIFY",
        },
      },
      {
        user: "{{agentName}}",
        content: {
          text: "Data verified successfully. Transaction ID: 0x...",
        },
      },
    ]
  ],
};