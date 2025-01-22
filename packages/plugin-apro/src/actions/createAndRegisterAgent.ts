import { Action, ActionExample, composeContext, elizaLogger, generateObject, HandlerCallback, IAgentRuntime, Memory, ModelClass, State } from "@elizaos/core";
import { AgentSDK, AgentSettings, parseNewAgentAddress } from "ai-agent-sdk-js";
import { createAgentTemplate } from "../templates";
import { AgentSettingsSchema, isAgentSettings } from "../types";
import { ContractTransactionResponse } from "ethers";

export const createAndRegisterAgent: Action = {
  name: "CREATE_AND_REGISTER_AGENT",
  similes: [
    'CREATE_AGENT',
    'REGISTER_AGENT',
  ],
  description: "create and register an agent",
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
        template: createAgentTemplate,
    });

    const agentSettingsDetail = await generateObject({
        runtime,
        context,
        modelClass: ModelClass.LARGE,
        schema: AgentSettingsSchema,
    });

    const agentSettings = agentSettingsDetail.object as AgentSettings;
    if (!isAgentSettings(agentSettings)) {
        throw new Error('Invalid content: ' + JSON.stringify(agentSettings));
    }
    elizaLogger.info('Agent settings received:', agentSettings);

    let tx: ContractTransactionResponse
    try {
        const agent = new AgentSDK({
            proxyAddress: runtime.getSetting('APRO_PROXY_ADDRESS') ?? process.env.APRO_PROXY_ADDRESS,
            rpcUrl: runtime.getSetting('APRO_RPC_URL') ?? process.env.APRO_RPC_URL,
            privateKey: runtime.getSetting('APRO_PRIVATE_KEY') ?? process.env.APRO_PRIVATE_KEY,
        });

        tx = await agent.createAndRegisterAgent({agentSettings})

        const receipt = await tx.wait()
        const agentAddress = parseNewAgentAddress(receipt)
        elizaLogger.log(`Created agent at address: ${agentAddress}`)

        callback({ text: 'Agent created and registered successfully: ' + agentAddress })
    } catch (error: any) {
        elizaLogger.error(`Error creating agent: ${error.message}`);
        await callback(
            {
                text: 'Error creating agent: ' + error.message,
            }
        )
    }
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: {
          text: `I want to Create and register agent by apro plugin:
          {
  signers: [
  '0x003CD3bD8Ac5b045be8E49d4dfd9928E1765E471',
  '0xdE3701195b9823E41b3fc2c98922A94399E2a01C',
  '0xB54E5D4faa950e8B6a01ed5a790Ac260c81Ad224',
  '0x48eE063a6c67144E09684ac8AD9a0044836f348B',
  '0xbBbCc052F1277dd94e88e8E5BD6D7FF9a29BaC98'
],
  threshold: 3,
  converterAddress: "0x24c36e9996eb84138Ed7cAa483B4c59FF7640E5C",
  agentHeader: {
    messageId: '2fd6db38-ce5c-473f-81c5-4fd62407b7bd',
    sourceAgentId: '32698bf1-ba3d-4334-8e66-cce5aa0bd3e8',
	sourceAgentName: 'ElizaOS Test Agent',
	targetAgentId: '1105302c-7556-49b2-b6fe-3aedba9c0682',
	messageType: 0,
    timestamp: 1737293817,
	priority: 1,
	ttl: 3600,
  },
}
          `,
        },
      },
      {
        user: "{{agentName}}",
        content: {
          text: "Creating and registering agent...",
          action: "CREATE_AND_REGISTER_AGENT",
        },
      },
    //   {
    //     user: "{{agentName}}",
    //     content: {
    //       text: "Agent created and registered successfully. Transaction ID: ..., agent ID is: ...",
    //     },
    //   },
    ]
  ],
}