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
    const config = await validateExtractorConfig(runtime);
    const url = `${config.FIREWALL_API_URL}`;

    let response;
    try {
        response = await fetch(url, {
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

    } catch (error) {
        elizaLogger.warn(`Firewall API failed: ${error.message} (${error.cause})`);

        if(config.FIREWALL_SCORE_FAIL >= config.FIREWALL_SCORE_THRESHOLD){            
            throw error;
        } else {
            return config.FIREWALL_SCORE_FAIL;
        }
    }
    
    if(response.status !== 200){

        if(config.FIREWALL_SCORE_FAIL >= config.FIREWALL_SCORE_THRESHOLD){
            throw new Error(`Firewall API failed: status=${response.status}, ${response.statusText}`);
        } else {
            return config.FIREWALL_SCORE_FAIL;
        }
    }

    try {
        const data = await response.json();
        return data?.risk || config.FIREWALL_SCORE_FAIL;
    } catch (error) {
        return config.FIREWALL_SCORE_FAIL;
    }
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
