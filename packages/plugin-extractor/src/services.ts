import {
    elizaLogger,
    IAgentRuntime,
    Service,
    ServiceType,
} from "@elizaos/core";
import { validateExtractorConfig } from "./environment";

export async function getPromptRiskScore(
    runtime: IAgentRuntime,
    text: string,
    type: string = "prompt"
) {
    const url = `${process.env.FIREWALL_RISKS_API}/firewall`; 
    const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            data: text,
            data_type: type,
            agent_id: runtime.agentId,
            agent_name: runtime.character.name,
            agent_provider: "eliza",
            id: "1",
        }),
    });
    const data = await response.json();
    return data.risk;
}

export class FirewallService extends Service {
    static get serviceType(): ServiceType {
        return ServiceType.FIREWALL;
    }

    get serviceType(): ServiceType {
        return ServiceType.FIREWALL;
    }

    async initialize(runtime: IAgentRuntime): Promise<void> {
        elizaLogger.info(FirewallLogInitMessage);

        const config = await validateExtractorConfig(runtime);

        if (runtime.actions.find((a) => a.name === "FIREWALL")) {
            if (
                config.FIREWALL_STOP_LIST.some((word) =>
                    runtime.character.name.toLowerCase().includes(word)
                )
            ) {
                elizaLogger.error(
                    `Forbidden by firewall: ${runtime.character.name}`
                );
                throw new Error(
                    `Forbidden by firewall: ${runtime.character.name}`
                );
            } else {
                let risk = await getPromptRiskScore(
                    runtime,
                    runtime.character.name,
                    "config"
                );

                if (risk > process.env.FIREWALL_SCORE_THRESHOLD) {
                    elizaLogger.error(
                        `Forbidden by firewall: ${runtime.character.name}`
                    );
                    throw new Error(
                        `Forbidden by firewall: ${runtime.character.name}`
                    );
                }
            }
        }
    }
}

export const FirewallLogInitMessage = `
  ░▒▓████████▓▒░▒▓█▓▒░▒▓███████▓▒░░▒▓████████▓▒░▒▓█▓▒░░▒▓█▓▒░░▒▓█▓▒░░▒▓██████▓▒░░▒▓█▓▒░      ░▒▓█▓▒░        
  ░▒▓█▓▒░      ░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░      ░▒▓█▓▒░░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░      ░▒▓█▓▒░        
  ░▒▓█▓▒░      ░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░      ░▒▓█▓▒░░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░      ░▒▓█▓▒░        
  ░▒▓██████▓▒░ ░▒▓█▓▒░▒▓███████▓▒░░▒▓██████▓▒░ ░▒▓█▓▒░░▒▓█▓▒░░▒▓█▓▒░▒▓████████▓▒░▒▓█▓▒░      ░▒▓█▓▒░        
  ░▒▓█▓▒░      ░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░      ░▒▓█▓▒░░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░      ░▒▓█▓▒░        
  ░▒▓█▓▒░      ░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░      ░▒▓█▓▒░░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░      ░▒▓█▓▒░        
  ░▒▓█▓▒░      ░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓████████▓▒░░▒▓█████████████▓▒░░▒▓█▓▒░░▒▓█▓▒░▒▓████████▓▒░▒▓████████▓▒░ 
  `;
