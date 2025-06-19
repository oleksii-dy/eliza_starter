import {
  composePromptFromState,
  ModelType,
  type Content,
  type IAgentRuntime,
  type State,
} from "@elizaos/core";
import { rephraseTemplate } from "src/templates";

interface RephraseParams {
  runtime: IAgentRuntime;
  content: Content;
  state: State;
}

export const rephrase = async ({ runtime, content, state }: RephraseParams) => {
  const {
    actions,
    attachments,
    text: initialText,
    thought: initialThought,
    source
  } = content;

  // fixme use more efficient way to clone state
  const clonedState = JSON.parse(JSON.stringify(state));
  clonedState.values.initialText = initialText;
  clonedState.values.initialThought = initialThought;

  const prompt = composePromptFromState({
    state: clonedState,
    template: rephraseTemplate,
  });

  const response = await runtime.useModel(ModelType.OBJECT_LARGE, {
    prompt,
  });

  // console.log("received response", response);

  const result: Content = {
    actions,
    attachments,
    text: response.message,
    thought: response.thought,
    source,
  };

  return result;
};
