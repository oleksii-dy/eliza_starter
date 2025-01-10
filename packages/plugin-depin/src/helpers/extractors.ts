import {
    IAgentRuntime,
    State,
    ModelClass,
    composeContext,
    generateText,
    elizaLogger,
} from "@elizaos/core";

import {
    locationExtractionTemplate,
    newsExtractionTemplate,
} from "../template";
import { parseTagContent } from "./parsers";

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

    const parsedLocation = parseTagContent(location, "extracted_location");

    elizaLogger.log("Extracted location is: ", parsedLocation);

    return parsedLocation;
}

export async function extractNewsQuery(
    state: State,
    runtime: IAgentRuntime
): Promise<string> {
    const newsExtractionContext = composeContext({
        state,
        template:
            // @ts-ignore
            runtime.character.templates?.newsExtractionTemplate ||
            newsExtractionTemplate,
    });
    const newsQuery = await generateText({
        runtime,
        context: newsExtractionContext,
        modelClass: ModelClass.SMALL,
    });

    const parsedNewsQuery = parseTagContent(newsQuery, "extracted_query");

    elizaLogger.log("Extracted news query is: ", parsedNewsQuery);

    return parsedNewsQuery;
}
