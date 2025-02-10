import {
    elizaLogger,
    IAgentRuntime,
    Memory,
    Service,
    ServiceType,
} from "@elizaos/core";
import axios from "axios";
import { IExtractorScore } from "./types";
import { validateExtractorConfig } from "./environment";

export const firewallValidateScore = async (
    message: Memory,
    threshold: number,
    api: string,
    type?: string
) => {
    const OID = "eliza";
    const TYPE = type || "prompt";
    const DATA_JSON = {
        id: message.id || null,
        agent_provider: OID,
        agent_id: message.agentId,
        agent_addr: null,
        data_type: TYPE,
        data: message.content.text,
    };

    elizaLogger.info("FIREWALL VALIDATION:", DATA_JSON);

    const response: { data: IExtractorScore } = await axios.post(
        `${api}/firewall`,
        DATA_JSON,
        {
            headers: {
                "Content-Type": "application/json",
            },
        }
    );

    try {
        const { risk } = response.data;

        if (risk >= threshold) {
            throw new Error(
                "🧙🏼‍♂️🧙🏼‍♂️🧙🏼‍♂️🧙🏼‍♂️🧙🏼‍♂️ YOU SHELL NOT PASS!!! 🧙🏼‍♂️🧙🏼‍♂️🧙🏼‍♂️🧙🏼‍♂️🧙🏼‍♂️ \n 💥💥💥💥💥💥💥💥 FIREWALL ELERT 💥💥💥💥💥💥💥💥"
            );
        } else {
            elizaLogger.info("🍀🍀🍀 ALL GOOD 🍀🍀🍀");
        }
    } catch (error) {
        throw new Error(error);
    }

    return;
};

export class ExtractorRiskService extends Service {
    static get serviceType(): ServiceType {
        return ServiceType.TEXT_GENERATION;
    }

    get serviceType(): ServiceType {
        return ServiceType.TEXT_GENERATION;
    }

    async initialize(runtime: IAgentRuntime): Promise<void> {
        const text = `agentId: ${runtime.agentId} / ${runtime.character.name} / ${runtime.character.id} / ${runtime.character.bio}`;
        const config = await validateExtractorConfig(runtime);

        await firewallValidateScore(
            {
                agentId: runtime.agentId,
                content: { text },
            } as Memory,
            Number(config.FIREWALL_RISKS_THRESHOLD),
            config.FIREWALL_RISKS_API
        );
    }
}
