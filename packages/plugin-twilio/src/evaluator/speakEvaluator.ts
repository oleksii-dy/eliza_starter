import { ActionEvaluator } from "@magickml/core";

export const speakEvaluator: ActionEvaluator = {
  name: 'speak',
  evaluate: async ({ agent, event, output }) => {
    // Check if this is a text event that should trigger speech
    if (event?.content?.text && output?.content?.text) {
      return true
    }
    return false
  }
}