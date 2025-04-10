import { type State } from '@elizaos/core';

type ContextParams = {
  state: State;
  template: string;
  userMessage?: string;
  [key: string]: any;
};

/**
 * Composes a context for LLM extraction by filling in template values
 */
export function composeContext(params: ContextParams): string {
  const { state, template, userMessage = '', ...rest } = params;
  
  // Get conversation history from state
  const conversation = (state.conversation as Array<{ role: string; content: string }> || [])
    .slice(-5) // Only use the last 5 messages
    .map(msg => `${msg.role}: ${msg.content}`)
    .join('\n');
  let result = template
    .replace(/{{userMessage}}/g, userMessage)
    .replace(/{{conversation}}/g, conversation);
  
  // Replace any additional template variables
  Object.entries(rest).forEach(([key, value]) => {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
  });
  
  return result;
}
