import {
    type Action,
    type IAgentRuntime,
    type Memory,
    type State,
    type HandlerCallback,
    elizaLogger,
    ModelClass,
    composeContext,
    generateObject,
} from '@elizaos/core';
import { XtreamlyAPI } from '../libs/XtreamlyAPI';
import { VolatilityAPI } from '../libs/VolatilityAPI';
import { retrieveVolatilityStateTemplate } from '../templates';
import { RetrieveVolatilityPredictionSchema, isRetrieveVolatilityPrediction } from '../types';

export const retrieveVolatilityState: Action = {
    name: 'RETRIEVE_VOLATILITY_STATE',
    similes: ['RETRIEVE_LIVE_VOLATILITY_STATE'],
    description: 'Retrieve live volatility state of a given symbol.',

    validate: async (runtime: IAgentRuntime, _message: Memory) => {
        elizaLogger.log('Validating runtime for RETRIEVE_VOLATILITY_STATE...');

        if (runtime.character.settings.secrets?.XTREAMLY_API_KEY) {
            process.env.XTREAMLY_API_KEY = runtime.character.settings.secrets?.XTREAMLY_API_KEY;
        }

        return process.env.XTREAMLY_API_KEY && new XtreamlyAPI().is_ok();
    },

    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state?: State,
        _options?: { [key: string]: unknown },
        callback?: HandlerCallback
    ) => {
        try {
            elizaLogger.log('Composing state for message:', message);
            let currentState = state;
            if (!currentState) {
                currentState = (await runtime.composeState(message)) as State;
            } else {
                currentState = await runtime.updateRecentMessageState(currentState);
            }

            const context = composeContext({
                state: currentState,
                template: retrieveVolatilityStateTemplate,
            });

            const queryParams = await generateObject({
                runtime,
                context,
                modelClass: ModelClass.LARGE,
                schema: RetrieveVolatilityPredictionSchema,
            });

            if (!isRetrieveVolatilityPrediction(queryParams.object)) {
                callback(
                    {
                        text: 'Invalid query params. Please check the inputs.',
                    },
                    []
                );
                return;
            }

            const { symbol } = queryParams.object;

            elizaLogger.log('Querying volatility state for:', symbol);
            const prediction = await new VolatilityAPI().state(symbol);

            callback({
                text: prediction.classification_description,
            });
        } catch (error) {
            elizaLogger.error('Error in retrieveVolatilityState:', error.message);
            callback({
                text: '❌ An error occurred while retrieving Xtreamly volatility state. Please try again later.',
            });
        }
    },

    examples: [
        [
            {
                user: 'user',
                content: {
                    text: 'Retrieve Ethereum market volatility state.',
                    action: 'RETRIEVE_VOLATILITY_STATE',
                },
            },
            {
                user: 'assistant',
                content: {
                    text: 'ETH price in highly volatile short momentum, requiring protective measures and caution.',
                },
            },
        ],
    ],
};
