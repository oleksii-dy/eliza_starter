import {
    Action,
    IAgentRuntime,
    Memory,
    HandlerCallback,
    State,
    composeContext,
    generateObject,
    ModelClass,
    elizaLogger,
} from "@elizaos/core";

import { CreateResourceSchema, isCreateResourceContent } from "../types";

import { createResourceTemplate } from "../templates";
import {CKBFiberService, ServiceTypeCKBFiber} from "../ckb/fiber/service.ts";
import {formatNodeInfo} from "../ckb/fiber/formatter.ts";

export const getInfoAction: Action = {
    name: "GET_NODE_INFO",
    similes: ["GET_NODE", "GET_INFO"],
    description: "Get fiber node information",
    validate: async (runtime: IAgentRuntime, _message: Memory) => {
        return !!runtime.getService(ServiceTypeCKBFiber);
    },
    handler: async (
        runtime: IAgentRuntime,
        _message: Memory,
        state: State,
        _options: any,
        callback: HandlerCallback
    ) => {
        try {
            const service = runtime.getService<CKBFiberService>(ServiceTypeCKBFiber);
            const nodeInfo = await service.rpcClient.getNodeInfo();
            const formattedInfo = formatNodeInfo(nodeInfo);

            callback({ text: formattedInfo }, []);
        } catch (error) {
            elizaLogger.error("Error creating resource:", error);
            callback(
                { text: "Failed to create resource. Please check the logs." },
                []
            );
        }
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Create a new resource with the name 'Resource1' and type 'TypeA'",
                },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: `Resource created successfully:
- Name: Resource1
- Type: TypeA`,
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Create a new resource with the name 'Resource2' and type 'TypeB'",
                },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: `Resource created successfully:
- Name: Resource2
- Type: TypeB`,
                },
            },
        ],
    ],
};
