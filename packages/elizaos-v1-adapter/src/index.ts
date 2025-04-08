// Export the main RuntimeAdapter class
export { RuntimeAdapter } from './adapters';

// Export adapter helper functions
export { adaptAction } from './adapters';
export { adaptProvider } from './adapters';
export { adaptEvaluator } from './adapters';
export { adaptMemory } from './adapters';
export { adaptContent } from './adapters';

// Export plugin conversion utilities
export { adaptPluginToV2, adaptPluginToV1 } from './adapters';

// Export legacy types
export { ModelClass, ServiceType, ModelClassToModelType, ServiceTypeMap } from './adapters';

// Export legacy generation functions
export {
  // TODO: what with those?
  //   generateText,
  //   generateObject,
  //   generateObjectDeprecated,
  //   generateImage,
  generateMessageResponse,
  generateShouldRespond,
  generateTrueOrFalse,
} from './adapters';

// Export legacy template functions
export { composeContext, composePromptFromState } from './adapters';
