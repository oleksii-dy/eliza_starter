import { IModelConfig } from '@elizaos/core';

export const modelConfig: IModelConfig = {
  provider: 'anthropic',
  name: 'claude-3-sonnet-20240229',
  forceProvider: true,
  settings: {
    temperature: 0.7,
    modelProvider: 'anthropic',
    disableLocalModels: true
  }
};