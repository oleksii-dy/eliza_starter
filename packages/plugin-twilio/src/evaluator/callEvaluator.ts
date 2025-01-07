import { ActionEvaluator } from "@magickml/core";

export const callEvaluator: ActionEvaluator = {
  name: 'twilio-call',
  evaluate: async ({ agent, event }) => {
    // Check if this is a call event
    return event?.source === 'twilio-call'
  }
}