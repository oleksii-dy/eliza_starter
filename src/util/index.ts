import { type IAgentRuntime, logger } from "@elizaos/core";
export * from "./db";
export * from "./eth";

type Logger = typeof logger;

export const getLogger = (runtime: IAgentRuntime) => {
  // @ts-expect-error logger in defined in runtime but not in the interface
  const logger = runtime.logger;

  if ("debug" in logger) {
    return logger as Logger;
  }

  throw new Error("Failed to get logger");
};