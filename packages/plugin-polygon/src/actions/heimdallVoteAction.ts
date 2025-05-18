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
import { HeimdallService, VoteOption } from '../services/HeimdallService';
import { z } from 'zod';
import { heimdallVoteActionTemplate } from '../templates'; // Assuming a template will be created

// --- Action Parameter Schema ---
const heimdallVoteParamsSchema = z.object({
  proposalId: z
    .union([z.string(), z.number()])
    .describe('The ID of the Heimdall governance proposal to vote on.'),
  option: z
    .nativeEnum(VoteOption)
    .describe(
      'The vote option (e.g., VOTE_OPTION_YES, VOTE_OPTION_NO). Provide the numeric value or the string key.'
    ),
});
type HeimdallVoteParams = z.infer<typeof heimdallVoteParamsSchema>;

// --- Helper to extract params from text if LLM fails ---
function extractHeimdallVoteParamsFromText(text: string): Partial<HeimdallVoteParams> {
  const params: Partial<HeimdallVoteParams> = {};
  logger.debug(`Attempting to extract HeimdallVoteParams from text: "${text}".`);

  const proposalIdMatch = text.match(/\b(?:proposal\s*id|prop\s*id)\s*[:\-]?\s*([\w\d\-]+)/i);
  if (proposalIdMatch?.[1]) {
    const id = proposalIdMatch[1];
    // Try to parse as number if it's purely numeric, otherwise keep as string
    params.proposalId = /^\d+$/.test(id) ? Number(id) : id;
  }

  // VOTE_OPTION_UNSPECIFIED = 0, VOTE_OPTION_YES = 1, VOTE_OPTION_ABSTAIN = 2, VOTE_OPTION_NO = 3, VOTE_OPTION_NO_WITH_VETO = 4
  const optionMatch = text.match(
    /\b(?:vote|option|support)\s*[:\-]?\s*(yes|no with veto|no|abstain|unspecified|1|2|3|4|0)/i
  );
  if (optionMatch?.[1]) {
    const optionStr = optionMatch[1].toLowerCase();
    if (optionStr === 'yes' || optionStr === '1') params.option = VoteOption.VOTE_OPTION_YES;
    else if (optionStr === 'no' || optionStr === '3') params.option = VoteOption.VOTE_OPTION_NO;
    else if (optionStr === 'abstain' || optionStr === '2')
      params.option = VoteOption.VOTE_OPTION_ABSTAIN;
    else if (optionStr === 'no with veto' || optionStr === '4')
      params.option = VoteOption.VOTE_OPTION_NO_WITH_VETO;
    else if (optionStr === 'unspecified' || optionStr === '0')
      params.option = VoteOption.VOTE_OPTION_UNSPECIFIED;
  }
  logger.debug('Manually extracted HeimdallVoteParams:', params);
  return params;
}

// --- Action Definition ---
export const heimdallVoteAction: Action = {
  name: 'HEIMDALL_VOTE_ON_PROPOSAL',
  similes: ['VOTE_HEIMDALL_PROPOSAL', 'CAST_VOTE_ON_HEIMDALL', 'HEIMDALL_GOVERNANCE_VOTE'],
  description: 'Casts a vote on a Heimdall governance proposal.',

  validate: async (runtime: IAgentRuntime): Promise<boolean> => {
    logger.debug('Validating HEIMDALL_VOTE_ON_PROPOSAL action...');
    const heimdallRpcUrl = runtime.getSetting('HEIMDALL_RPC_URL');
    const privateKey = runtime.getSetting('PRIVATE_KEY'); // Assuming PRIVATE_KEY is the general key for the plugin

    if (!heimdallRpcUrl) {
      logger.error('HEIMDALL_RPC_URL is not configured for Heimdall actions.');
      return false;
    }
    if (!privateKey) {
      logger.error('PRIVATE_KEY is not configured for Heimdall actions.');
      return false;
    }
    logger.debug('HEIMDALL_VOTE_ON_PROPOSAL validation successful based on settings.');
    return true;
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State | undefined,
    _options: unknown, // Action-specific options, if any, defined in action registration
    callback: HandlerCallback | undefined
  ) => {
    logger.info(`Handling HEIMDALL_VOTE_ON_PROPOSAL for message: ${message.id}`);
    const rawMessageText = message.content.text || '';
    let extractedParams: (Partial<HeimdallVoteParams> & { error?: string }) | null = null;

    try {
      const heimdallService = runtime.getService<HeimdallService>(HeimdallService.serviceType);
      if (!heimdallService) {
        throw new Error('HeimdallService is not available. Ensure it is registered and started.');
      }

      // Parameter extraction using LLM (via template)
      try {
        const prompt = composePromptFromState({
          state,
          template: heimdallVoteActionTemplate, // Assumes this template is defined
        });
        const modelResponse = await runtime.useModel(ModelType.TEXT_SMALL, {
          prompt,
        });
        const parsed = parseJSONObjectFromText(modelResponse);
        if (parsed) {
          extractedParams = parsed as Partial<HeimdallVoteParams>;
        }
        logger.debug(
          'HEIMDALL_VOTE_ON_PROPOSAL: Extracted params via TEXT_SMALL:',
          extractedParams
        );
        if (extractedParams?.error) {
          throw new Error(extractedParams.error);
        }
      } catch (e: unknown) {
        const errorMsg = e instanceof Error ? e.message : String(e);
        logger.warn(
          `HEIMDALL_VOTE_ON_PROPOSAL: Failed to parse JSON from model response or model returned error (Proceeding to manual extraction): ${errorMsg}`
        );
      }

      // Fallback to manual extraction if LLM fails or params are incomplete
      if (
        !extractedParams ||
        extractedParams.error ||
        !extractedParams.proposalId ||
        extractedParams.option === undefined
      ) {
        logger.info(
          'HEIMDALL_VOTE_ON_PROPOSAL: Model extraction insufficient or failed, attempting manual parameter extraction.'
        );
        const manualParams = extractHeimdallVoteParamsFromText(rawMessageText);
        if (extractedParams && !extractedParams.error) {
          extractedParams = { ...manualParams, ...extractedParams }; // Give precedence to model extracted if not error
        } else {
          extractedParams = manualParams;
        }
        logger.debug(
          'HEIMDALL_VOTE_ON_PROPOSAL: Params after manual extraction attempt:',
          extractedParams
        );
      }

      // Validate parameters using Zod schema
      const validatedParams = heimdallVoteParamsSchema.safeParse(extractedParams);
      if (!validatedParams.success) {
        logger.error(
          'HEIMDALL_VOTE_ON_PROPOSAL: Invalid parameters after all extraction attempts.',
          validatedParams.error.flatten()
        );
        throw new Error(
          `Invalid parameters: ${validatedParams.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ')}`
        );
      }

      const { proposalId, option } = validatedParams.data;

      logger.debug('Heimdall vote parameters for service:', {
        proposalId,
        option,
      });
      const txHash = await heimdallService.voteOnProposal(proposalId, option);

      const successMsg = `Successfully voted ${VoteOption[option]} on Heimdall proposal ${proposalId}. Transaction Hash: ${txHash}`;
      logger.info(successMsg);

      if (callback) {
        await callback({
          text: successMsg,
          content: {
            success: true,
            transactionHash: txHash,
            proposalId,
            voteOption: VoteOption[option],
          },
          actions: [heimdallVoteAction.name],
          source: message.content.source,
        });
      }
      return {
        success: true,
        transactionHash: txHash,
        proposalId,
        voteOption: VoteOption[option],
      };
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      logger.error('Error in HEIMDALL_VOTE_ON_PROPOSAL handler:', errMsg, error);
      if (callback) {
        await callback({
          text: `Error voting on Heimdall proposal: ${errMsg}`,
          actions: [heimdallVoteAction.name],
          source: message.content.source,
        });
      }
      return { success: false, error: errMsg };
    }
  },

  examples: [
    [
      {
        name: 'User votes YES on Heimdall',
        id: 'heimdall-vote-ex1-user',
        role: 'user',
        entityId: 'user123',
        roomId: 'room456',
        timestamp: new Date().toISOString(),
        actions: ['HEIMDALL_VOTE_ON_PROPOSAL'],
        content: {
          text: 'Vote YES on Heimdall proposal 42.',
          source: 'user-input',
        },
      } as ActionExample,
    ],
    [
      {
        name: 'User votes NO on Heimdall',
        id: 'heimdall-vote-ex2-user',
        role: 'user',
        entityId: 'user123',
        roomId: 'room456',
        timestamp: new Date().toISOString(),
        actions: ['HEIMDALL_VOTE_ON_PROPOSAL'],
        content: {
          text: 'Cast a NO vote for Heimdall governance proposal ID 15.',
          source: 'user-input',
        },
      } as ActionExample,
    ],
    [
      {
        name: 'User votes ABSTAIN on Heimdall',
        id: 'heimdall-vote-ex3-user',
        role: 'user',
        entityId: 'user123',
        roomId: 'room456',
        timestamp: new Date().toISOString(),
        actions: ['HEIMDALL_VOTE_ON_PROPOSAL'],
        content: {
          text: 'On Heimdall, vote ABSTAIN for proposal 77 using option 2.',
          source: 'user-input',
        },
      } as ActionExample,
    ],
  ],
};
