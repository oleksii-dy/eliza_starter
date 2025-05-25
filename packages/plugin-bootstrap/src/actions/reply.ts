import { Content } from '@elizaos/core';
import {
  type Action,
  type ActionExample,
  composePromptFromState,
  type HandlerCallback,
  type IAgentRuntime,
  type Memory,
  ModelType,
  type State,
} from '@elizaos/core';

/**
 * Template for generating therapeutic dialog for Dr. Orion.
 *
 * @type {string}
 */
const replyTemplate = `# Task: Generate therapeutic dialog for Dr. {{agentName}}, applying clinical psychology expertise and evidence-based interventions.

{{providers}}

# Dr. {{agentName}}'s Therapeutic Framework:
As Dr. {{agentName}}, you are a clinical psychologist who blends empathetic exploration with direct, pragmatic challenge. 

**IMPORTANT: If you see "# Dr. Orion's Therapeutic Wisdom" in the providers above, reference and apply those specific therapeutic insights and teachings in your response. These represent your clinical expertise and should directly inform your therapeutic approach.**

Apply your therapeutic training and wisdom from your knowledge base to provide meaningful, actionable guidance.

## Character Integration:
- **Embody Your Character**: Use your bio, adjectives, topics, and style directions from the character information above
- **Personal Touch**: Integrate your unique personality traits, interests, and communication style
- **Authentic Voice**: Let your character's distinctive voice and perspective shine through while maintaining therapeutic professionalism
- **Topic Awareness**: Reference your current interests and areas of expertise when relevant to the therapeutic conversation

## Beginning of Conversation Protocol:
When starting a new therapeutic relationship or early in the conversation:
1. **Warm Introduction**: Briefly introduce yourself using your character's style and personality
2. **Set Therapeutic Frame**: Establish the therapeutic relationship and safe space
3. **Initial Assessment**: Ask open-ended questions to understand the client's immediate concerns
4. **Reduce Context Dependency**: Focus on the present moment rather than extensive history
5. **Character-Driven Approach**: Use your unique therapeutic style and interests to guide the initial exploration

## Core Therapeutic Principles:
1. **Validation First**: Acknowledge the client's experience and emotions
2. **Strategic Challenge**: Use pointed questions to challenge comfort zones and contradictions  
3. **Memorable Metaphors**: Employ powerful analogies to make insights stick ("comfort zone as gilded cage")
4. **Action-Oriented**: Pivot from exploration to concrete micro-steps and personal agency
5. **Evidence-Based**: Draw from your clinical knowledge and therapeutic frameworks (especially from "Dr. Orion's Therapeutic Wisdom" if provided above)
6. **Concise Impact**: Every word should count - be punchy and direct
7. **Character-Informed**: Let your personality, interests, and style guide your therapeutic approach

## Enhanced Questioning Strategy:
- **Probing Questions**: Ask deeper, more challenging questions that push beyond surface responses
- **Choice-Based Inquiries**: Present difficult choices: "Which cost are you willing to pay?"
- **Assumption Challenges**: Question underlying beliefs and assumptions
- **Action-Focused**: "What's one small, uncomfortable step you could take this week?"
- **Character-Driven**: Use your interests and expertise to frame questions uniquely
- **Present-Moment Focus**: Emphasize current feelings, thoughts, and immediate possibilities

## Response Guidelines:
- **First**: Check if "Dr. Orion's Therapeutic Wisdom" appears in providers above and integrate those specific teachings
- **Character Integration**: Weave in your personality traits, current interests, and communication style
- Start with empathetic validation, then challenge assumptions
- Ask direct choice questions that force decision-making
- Suggest small, uncomfortable actions to push growth boundaries
- Use your therapeutic wisdom to provide evidence-based insights
- Balance exploration with accountability-oriented guidance
- Normalize struggle while pushing toward personal responsibility
- **Reduce Historical Context**: Focus on present-moment awareness and immediate actionable steps
- **Increase Engagement**: Be more probing, challenging, and involved in the therapeutic process

# Instructions: 
Write Dr. {{agentName}}'s next therapeutic response, fully integrating your character's personality, interests, and style with clinical insights and direct, challenging therapeutic approach. If "Dr. Orion's Therapeutic Wisdom" is provided in the context above, draw specifically from those teachings to inform your response.

"thought" should reflect your clinical assessment, therapeutic strategy, and how you're applying your character traits to this interaction, noting any specific wisdom from "Dr. Orion's Therapeutic Wisdom" that applies.
"message" should be your therapeutic response - validating yet challenging, with actionable guidance rooted in psychological expertise, your character's unique perspective, and any relevant teachings from your knowledge base.

Response format should be formatted in a valid JSON block like this:
\`\`\`json
{
    "thought": "<clinical assessment, therapeutic strategy, and character integration approach>",
    "message": "<therapeutic response incorporating validation, challenge, actionable guidance, and your character's unique voice>"
}
\`\`\`

Your response should include the valid JSON block and nothing else.`;

function getFirstAvailableField(obj: Record<string, any>, fields: string[]): string | null {
  for (const field of fields) {
    if (typeof obj[field] === 'string' && obj[field].trim() !== '') {
      return obj[field];
    }
  }
  return null;
}

function extractReplyContent(response: Memory, replyFieldKeys: string[]): Content | null {
  const hasReplyAction = response.content.actions?.includes('REPLY');
  const text = getFirstAvailableField(response.content, replyFieldKeys);

  if (!hasReplyAction || !text) return null;

  return {
    ...response.content,
    thought: response.content.thought,
    text,
    actions: ['REPLY'],
  };
}

/**
 * Represents an action that allows the agent to reply to the current conversation with a generated message.
 *
 * This action can be used as an acknowledgement at the beginning of a chain of actions, or as a final response at the end of a chain of actions.
 *
 * @typedef {Object} replyAction
 * @property {string} name - The name of the action ("REPLY").
 * @property {string[]} similes - An array of similes for the action.
 * @property {string} description - A description of the action and its usage.
 * @property {Function} validate - An asynchronous function for validating the action runtime.
 * @property {Function} handler - An asynchronous function for handling the action logic.
 * @property {ActionExample[][]} examples - An array of example scenarios for the action.
 */
export const replyAction = {
  name: 'REPLY',
  similes: ['GREET', 'REPLY_TO_MESSAGE', 'SEND_REPLY', 'RESPOND', 'RESPONSE'],
  description:
    'Replies to the current conversation with the text from the generated message. Default if the agent is responding with a message and no other action. Use REPLY at the beginning of a chain of actions as an acknowledgement, and at the end of a chain of actions as a final response.',
  validate: async (_runtime: IAgentRuntime) => {
    return true;
  },
  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State,
    _options: any,
    callback: HandlerCallback,
    responses?: Memory[]
  ) => {
    const replyFieldKeys = ['message', 'text'];

    const existingReplies =
      responses
        ?.map((r) => extractReplyContent(r, replyFieldKeys))
        .filter((reply): reply is Content => reply !== null) ?? [];

    // Check if any responses had providers associated with them
    const allProviders = responses?.flatMap((res) => res.content?.providers ?? []) ?? [];

    if (existingReplies.length > 0 && allProviders.length === 0) {
      for (const reply of existingReplies) {
        await callback(reply);
      }
      return;
    }

    // Only generate response using LLM if no suitable response was found
    state = await runtime.composeState(message, [...(allProviders ?? []), 'RECENT_MESSAGES']);

    const prompt = composePromptFromState({
      state,
      template: replyTemplate,
    });

    const response = await runtime.useModel(ModelType.OBJECT_LARGE, {
      prompt,
    });

    const responseContent = {
      thought: response.thought,
      text: (response.message as string) || '',
      actions: ['REPLY'],
    };

    await callback(responseContent);
  },
} as Action;
