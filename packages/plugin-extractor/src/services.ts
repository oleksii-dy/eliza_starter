import {
    elizaLogger,
    IAgentRuntime,
    Service,
    ServiceType,
} from "@elizaos/core";
import { validateExtractorConfig } from "./environment";
import { FIREWALL_ID, FIREWALL_CONFIG_ID, FIREWALL_AGENT_FRAMEWORK, FIREWALL_VER } from "./const";

export async function getRiskScore(
    runtime: IAgentRuntime,
    text: string,
    type: string
) {
    const url = `${process.env.FIREWALL_API_URL}`;
    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...(process.env.FIREWALL_API_KEY?.length
                ? { "Authorization": `Bearer ${process.env.FIREWALL_API_KEY}` }
                : {}),
        },
        body: JSON.stringify({
            data: text,
            data_type: type,
            agent_id: runtime.agentId,
            agent_name: runtime.character.name,
            agent_provider: FIREWALL_AGENT_FRAMEWORK,
            id: "1",
        }),
    });

    if(response.status !== 200){
        throw new Error(`Firewall API failed: status=${response.status}, ${response.statusText}`);
    }

    const data = await response.json();

    return data?.risk || 0;
}

export class FirewallService extends Service {
    static get serviceType(): ServiceType {
        return ServiceType.FIREWALL;
    }

    get serviceType(): ServiceType {
        return ServiceType.FIREWALL;
    }

    async initialize(runtime: IAgentRuntime): Promise<void> {

        const config = await validateExtractorConfig(runtime);
        if(config.FIREWALL_WELCOME){
            elizaLogger.info(FirewallLogInitMessage(FIREWALL_VER));
        }

        if (runtime.actions.find((a) => a.name === FIREWALL_ID)) {
            
            let risk = await getRiskScore(
                runtime,
                JSON.stringify(runtime.character),
                FIREWALL_CONFIG_ID
            );

            if (risk > process.env.FIREWALL_SCORE_THRESHOLD) {
                elizaLogger.error(
                    `Forbidden by firewall: ${runtime.character.name}(${runtime.character.id}): score=${risk} (threshold=${process.env.FIREWALL_SCORE_THRESHOLD})`
                );
                throw new Error(
                    `Forbidden by firewall: agent=${runtime.character.id}`
                );
            }
            
        }
    }
}

function FirewallLogInitMessage(ver:string):string {
    const v = ver.padEnd(11, ' ');
    return `
┌═════════════════════════════════════┐
│            FIREWALL PLUGIN          │
├─────────────────────────────────────┤
│  Checking Agent Profile...          │
│  Version: ${v}               │
└═════════════════════════════════════┘
`;
}
