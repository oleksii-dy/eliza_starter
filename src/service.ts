import { type IAgentRuntime, logger, Service } from "@elizaos/core";
import assert from "node:assert";
import { LEVVA_ACTIONS } from "./constants.ts";

const KNOWN_ACTIONS = Object.values(LEVVA_ACTIONS);

export class LevvaService extends Service {
  static serviceType = "levva";
  capabilityDescription =
    "Levva service should analyze the user's portfolio, suggest earning strategies, swap crypto assets, etc.";

  constructor(runtime: IAgentRuntime) {
    super(runtime);

    // services are initialized last in plugin register; use that behavior to modify reply action
    const plugin = runtime.plugins.find((plugin) => plugin.name === "levva");
    assert(plugin, "Levva plugin not found");

    let replyActionIndex = runtime.actions.findIndex(
      (action) => action.name === "REPLY"
    );

    assert(replyActionIndex !== -1, "REPLY action not found");

    runtime.actions[replyActionIndex].description +=
      ` If one of these actions(${KNOWN_ACTIONS.join(
        ", "
      )}) is processed, the REPLY action should be skipped, in this case IGNORE corresponding rule in IMPORTANT ACTION ORDERING RULES section.`;

    for (const actionName of KNOWN_ACTIONS) {
      // ensure that our actions are handled before the reply action
      const actionIndex = runtime.actions.findIndex(
        (action) => action.name === actionName
      );

      assert(actionIndex !== -1, `Action[${actionName}] not found`);
      const action = runtime.actions.splice(actionIndex, 1)[0];
      assert(action, `Action at position ${actionIndex} not defined`);

      replyActionIndex = runtime.actions.findIndex(
        (action) => action.name === "REPLY"
      );

      runtime.actions.splice(replyActionIndex, 0, action);
    }

    // console.log("runtime.actions:", runtime.actions);
  }

  static async start(runtime: IAgentRuntime) {
    logger.info("*** Starting Levva service ***");
    const service = new LevvaService(runtime);
    return service;
  }

  static async stop(runtime: IAgentRuntime) {
    logger.info("*** Stopping Levva service ***");
    // get the service from the runtime
    const service = runtime.getService(LevvaService.serviceType);
    if (!service) {
      throw new Error("Levva service not found");
    }
    service.stop();
  }

  async stop() {
    logger.info("*** Stopping levva service instance ***");
  }
}
