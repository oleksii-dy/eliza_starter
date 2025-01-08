import {
    IAgentRuntime,
    State,
    ModelClass,
    composeContext,
    generateText,
    elizaLogger,
} from "@elizaos/core";

import { locationExtractionTemplate } from "../template";
import { parseLocation } from "../parsers";

export async function extractLocationQuestion(
    state: State,
    runtime: IAgentRuntime
): Promise<string> {
    const locationExtractionContext = composeContext({
        state,
        template:
            // @ts-ignore
            runtime.character.templates?.locationExtractionTemplate ||
            locationExtractionTemplate,
    });
    const location = await generateText({
        runtime,
        context: locationExtractionContext,
        modelClass: ModelClass.SMALL,
    });

    const parsedLocation = parseLocation(location);

    elizaLogger.log("Extracted location is: ", parsedLocation);

    return parsedLocation;
}
