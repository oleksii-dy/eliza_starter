import {
    composeContext,
    generateText,
    ModelClass,
    parseJSONObjectFromText,
    IAgentRuntime,
    Memory,
    State,
} from "@elizaos/core";

// Extracted from the ElizaOS - Client-Discord
export const getDateRange = async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State,
    dateRangeTemplate: string
) => {
    const context = composeContext({
        state,
        template: dateRangeTemplate,
    });

    console.log("context", context);

    for (let i = 0; i < 5; i++) {
        const response = await generateText({
            runtime,
            context,
            modelClass: ModelClass.MEDIUM,
        });
        console.log("response", response);
        // try parsing to a json object
        const parsedResponse = parseJSONObjectFromText(response) as {
            objective: string;
            start: string | number;
            end: string | number;
            period: string;
        } | null;
        // see if it contains objective, start and end
        if (parsedResponse) {
            if (
                parsedResponse.objective &&
                parsedResponse.start &&
                parsedResponse.end &&
                parsedResponse.period
            ) {
                // TODO: parse start and end into timestamps
                const startIntegerString = (
                    parsedResponse.start as string
                ).match(/\d+/)?.[0];
                const endIntegerString = (parsedResponse.end as string).match(
                    /\d+/
                )?.[0];

                // parse multiplier
                const multipliers = {
                    second: 1 * 1000,
                    minute: 60 * 1000,
                    hour: 3600 * 1000,
                    day: 86400 * 1000,
                    week: 604800 * 1000,
                    month: 2629746 * 1000,
                    year: 31536000 * 1000,
                };

                const startMultiplier = (parsedResponse.start as string).match(
                    /second|minute|hour|day|week|month|year/
                )?.[0];
                const endMultiplier = (parsedResponse.end as string).match(
                    /second|minute|hour|day|week|month|year/
                )?.[0];

                const startInteger = startIntegerString
                    ? parseInt(startIntegerString)
                    : 0;
                const endInteger = endIntegerString
                    ? parseInt(endIntegerString)
                    : 0;

                // multiply by multiplier
                const startTime =
                    startInteger *
                    multipliers[startMultiplier as keyof typeof multipliers];

                const endTime =
                    endInteger *
                    multipliers[endMultiplier as keyof typeof multipliers];
                console.log("endTime", endTime);

                // get the current time and subtract the start and end times
                const startProvisional = Date.now() - startTime;
                const endProvisional =
                    Date.now() - endTime - multipliers.minute * 20;
                // Needed to reverse the start and end times to get the correct date range
                parsedResponse.start =
                    startProvisional < endProvisional
                        ? startProvisional
                        : endProvisional;
                parsedResponse.end =
                    startProvisional < endProvisional
                        ? endProvisional
                        : startProvisional;
                parsedResponse.period = parsedResponse.period;
                return parsedResponse;
            }
        }
    }
};
