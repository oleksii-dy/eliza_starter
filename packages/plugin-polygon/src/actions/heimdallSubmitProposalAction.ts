import {
  type Action,
  type IAgentRuntime,
  type Memory,
  type State,
  type HandlerCallback,
  logger,
  composePromptFromState,
  ModelType,
  parseJSONObjectFromText,
  type ActionExample,
} from '@elizaos/core';
import {
  HeimdallService,
  type TextProposal as ServiceTextProposal, // Alias to avoid name clash if needed
  type ParameterChangeProposal as ServiceParameterChangeProposal,
} from '../services/HeimdallService';
import { z } from 'zod';
import { heimdallSubmitProposalActionTemplate } from '../templates'; // Will be created

// --- Action Parameter Schemas ---
const paramChangeSchema = z.object({
  subspace: z.string().min(1),
  key: z.string().min(1),
  value: z.string(), // Value can be empty string
});

const textProposalSchema = z.object({
  type: z.literal('TextProposal'),
  title: z.string().min(1).describe('Title of the text proposal.'),
  description: z.string().min(1).describe('Description of the text proposal.'),
});

const parameterChangeProposalSchema = z.object({
  type: z.literal('ParameterChangeProposal'),
  title: z.string().min(1).describe('Title of the parameter change proposal.'),
  description: z.string().min(1).describe('Description of the parameter change proposal.'),
  changes: z.array(paramChangeSchema).min(1).describe('Array of parameter changes.'),
});

// Discriminated union for proposal content
const proposalContentSchema = z.discriminatedUnion('type', [
  textProposalSchema,
  parameterChangeProposalSchema,
]);

// Define ZodProposalContent based on the schema used for params
type ZodProposalContent = z.infer<typeof proposalContentSchema>;

const heimdallSubmitProposalParamsSchema = z.object({
  content: proposalContentSchema.describe(
    'The content of the proposal (TextProposal or ParameterChangeProposal).'
  ),
  initialDepositAmount: z
    .string()
    .min(1)
    .describe('The amount of the initial deposit for the proposal (e.g., "10000000").'),
  initialDepositDenom: z
    .string()
    .optional()
    .default('matic')
    .describe('The denomination of the initial deposit (default: "matic").'),
});

type HeimdallSubmitProposalParams = z.infer<typeof heimdallSubmitProposalParamsSchema>;

// --- Helper to extract params from text (simplified, relies more on LLM template) ---
function extractHeimdallSubmitProposalParamsFromText(
  text: string
): Partial<HeimdallSubmitProposalParams> {
  logger.debug(`Attempting to extract HeimdallSubmitProposalParams from text: "${text}".`);
  const params: Partial<HeimdallSubmitProposalParams> = {};
  const depositAmountMatch = text.match(/deposit(?:Amount)?[:\\-]?\\s*(\\d+)/i);
  if (depositAmountMatch?.[1]) params.initialDepositAmount = depositAmountMatch[1];

  const depositDenomMatch = text.match(/depositDenom[:\\-]?\\s*(\\w+)/i);
  if (depositDenomMatch?.[1]) params.initialDepositDenom = depositDenomMatch[1];

  // Use ZodProposalContent for partialContent
  const partialContent: Partial<ZodProposalContent> = {};
  const titleMatch = text.match(/title[:\\-]?\\s*([\"\'](.+?)[\"\']|([^,\\n{\\[]+))/i);
  if (titleMatch?.[2] || titleMatch?.[3]) {
    partialContent.title = (titleMatch[2] || titleMatch[3]).trim();
  }

  const descriptionMatch = text.match(/description[:\\-]?\\s*([\"\'](.+?)[\"\']|([^,\\n{\\[]+))/i);
  if (descriptionMatch?.[2] || descriptionMatch?.[3]) {
    partialContent.description = (descriptionMatch[2] || descriptionMatch[3]).trim();
  }

  if (
    text.toLowerCase().includes('parameterchange') ||
    text.toLowerCase().includes('param change')
  ) {
    partialContent.type = 'ParameterChangeProposal';
  } else if (partialContent.title) {
    partialContent.type = 'TextProposal';
  }

  if (Object.keys(partialContent).length > 0) {
    // Ensure the 'content' field of 'params' expects ZodProposalContent or a compatible type.
    // heimdallSubmitProposalParamsSchema defines content based on proposalContentSchema (which is ZodProposalContent)
    params.content = partialContent as ZodProposalContent;
  }

  logger.debug('Manually extracted HeimdallSubmitProposalParams (partial):', params);
  return params;
}

// --- Action Definition ---
export const heimdallSubmitProposalAction: Action = {
  name: 'HEIMDALL_SUBMIT_PROPOSAL',
  similes: [
    'SUBMIT_HEIMDALL_PROPOSAL',
    'CREATE_HEIMDALL_GOVERNANCE_PROPOSAL',
    'HEIMDALL_NEW_PROPOSAL',
  ],
  description: 'Submits a new governance proposal (Text or ParameterChange) to Heimdall.',

  validate: async (runtime: IAgentRuntime): Promise<boolean> => {
    logger.debug('Validating HEIMDALL_SUBMIT_PROPOSAL action...');
    const heimdallRpcUrl = runtime.getSetting('HEIMDALL_RPC_URL');
    const privateKey = runtime.getSetting('PRIVATE_KEY');

    if (!heimdallRpcUrl) {
      logger.error('HEIMDALL_RPC_URL is not configured.');
      return false;
    }
    if (!privateKey) {
      logger.error('PRIVATE_KEY is not configured.');
      return false;
    }
    logger.debug('HEIMDALL_SUBMIT_PROPOSAL validation successful.');
    return true;
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State | undefined,
    _options: unknown,
    callback: HandlerCallback | undefined
  ) => {
    logger.info(`Handling HEIMDALL_SUBMIT_PROPOSAL for message: ${message.id}`);
    const rawMessageText = message.content.text || '';
    let extractedParams: (Partial<HeimdallSubmitProposalParams> & { error?: string }) | null = null;

    try {
      const heimdallService = runtime.getService<HeimdallService>(HeimdallService.serviceType);
      if (!heimdallService) {
        throw new Error('HeimdallService is not available.');
      }

      try {
        const prompt = composePromptFromState({
          state,
          template: heimdallSubmitProposalActionTemplate,
        });
        const modelResponse = await runtime.useModel(ModelType.TEXT_SMALL, {
          prompt,
        });
        const parsed = parseJSONObjectFromText(modelResponse);
        if (parsed) {
          extractedParams = parsed as Partial<HeimdallSubmitProposalParams>;
        }
        logger.debug('HEIMDALL_SUBMIT_PROPOSAL: Extracted params via TEXT_SMALL:', extractedParams);
        if (extractedParams?.error) {
          throw new Error(extractedParams.error);
        }
      } catch (e: unknown) {
        const errorMsg = e instanceof Error ? e.message : String(e);
        logger.warn(
          `HEIMDALL_SUBMIT_PROPOSAL: Failed to parse JSON from model (Proceeding to manual): ${errorMsg}`
        );
      }

      if (
        !extractedParams ||
        extractedParams.error ||
        !extractedParams.content ||
        !extractedParams.initialDepositAmount
      ) {
        logger.info(
          'HEIMDALL_SUBMIT_PROPOSAL: Model extraction insufficient, attempting manual parameter extraction.'
        );
        const manualParams = extractHeimdallSubmitProposalParamsFromText(rawMessageText);
        if (extractedParams && !extractedParams.error) {
          extractedParams = { ...manualParams, ...extractedParams };
          // Deep merge for content might be needed if both provide parts of it
          if (manualParams.content && extractedParams.content) {
            extractedParams.content = {
              ...manualParams.content,
              ...extractedParams.content,
            } as ZodProposalContent;
          }
        } else {
          extractedParams = manualParams;
        }
        logger.debug('HEIMDALL_SUBMIT_PROPOSAL: Params after manual extraction:', extractedParams);
      }

      const validatedParams = heimdallSubmitProposalParamsSchema.safeParse(extractedParams);
      if (!validatedParams.success) {
        logger.error(
          'HEIMDALL_SUBMIT_PROPOSAL: Invalid parameters.',
          validatedParams.error.flatten()
        );
        throw new Error(
          `Invalid parameters: ${validatedParams.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ')}`
        );
      }

      const { content, initialDepositAmount, initialDepositDenom } = validatedParams.data;

      // The `content` from Zod will have the `type` discriminator which we don't want in the service call directly.
      // The service determines the type based on the presence of 'changes'.
      // We need to pass the actual content object without the extra 'type' field.
      const { type, ...actualContent } = content;

      const txHash = await heimdallService.submitProposal(
        actualContent as ServiceParameterChangeProposal | ServiceTextProposal, // Cast to service-level types
        initialDepositAmount,
        initialDepositDenom
      );

      const successMsg = `Successfully submitted Heimdall proposal. Type: ${type}, Title: ${actualContent.title}. Tx Hash: ${txHash}`;
      logger.info(successMsg);

      if (callback) {
        await callback({
          text: successMsg,
          content: {
            success: true,
            transactionHash: txHash,
            proposalType: type,
            title: actualContent.title,
          },
          actions: [heimdallSubmitProposalAction.name],
          source: message.content.source,
        });
      }
      return {
        success: true,
        transactionHash: txHash,
        proposalType: type,
        title: actualContent.title,
      };
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      logger.error('Error in HEIMDALL_SUBMIT_PROPOSAL handler:', errMsg, error);
      if (callback) {
        await callback({
          text: `Error submitting Heimdall proposal: ${errMsg}`,
          actions: [heimdallSubmitProposalAction.name],
          source: message.content.source,
        });
      }
      return { success: false, error: errMsg };
    }
  },

  examples: [
    [
      {
        name: 'User submits Heimdall TextProposal',
        id: 'hsp-ex1-user',
        role: 'user',
        entityId: 'u1',
        roomId: 'r1',
        timestamp: new Date().toISOString(),
        actions: ['HEIMDALL_SUBMIT_PROPOSAL'],
        content: {
          text: "Submit a Heimdall text proposal titled 'Network Upgrade Info' with description 'Details about upcoming v2 upgrade.' and deposit 10000000 matic.",
          source: 'user-input',
        },
      } as ActionExample,
    ],
    [
      {
        name: 'User submits Heimdall ParameterChangeProposal',
        id: 'hsp-ex2-user',
        role: 'user',
        entityId: 'u1',
        roomId: 'r1',
        timestamp: new Date().toISOString(),
        actions: ['HEIMDALL_SUBMIT_PROPOSAL'],
        content: {
          text: "Propose a parameter change on Heimdall. Title: 'Update Staking Param', Description: 'Increase max validators'. Change subspace 'staking', key 'MaxValidators', value '120'. Initial deposit: 5000000 matic.",
          source: 'user-input',
        },
      } as ActionExample,
    ],
  ],
};
