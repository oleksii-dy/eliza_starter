import {
    Content,
    elizaLogger,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    Service,
    ServiceType,
    State,
} from "@elizaos/core";
import axios from "axios";
import { IExtractorScore } from "./types";
import { validateExtractorConfig } from "./environment";

// export const firewallValidateScore = async (
//     message: Memory,
//     threshold: number,
//     api: string,
//     runtime: IAgentRuntime | null,
//     callback: HandlerCallback | null,
//     state: State | null
// ) => {
//     const OID = "eliza";
//     const TYPE = runtime ? "prompt" : "config";
//     const DATA_JSON = {
//         id: message.id || null,
//         agent_provider: OID,
//         agent_id: message.agentId,
//         agent_addr: null,
//         data_type: TYPE,
//         data: message.content.text,
//     };

//     elizaLogger.info("FIREWALL VALIDATION:", DATA_JSON);

//     const response: { data: IExtractorScore } = await axios.post(
//         `${api}/firewall`,
//         DATA_JSON,
//         {
//             headers: {
//                 "Content-Type": "application/json",
//             },
//         }
//     );

//     try {
//         const { risk } = response.data;

//         if (risk >= threshold) {
//             if (runtime) {
//                 elizaLogger.error("HIGH RISK");
//                 let rejectMessage: Content = {
//                     text: `Forbidden by firewall: '${message.content.text}'`,
//                     action: "IGNORE",
//                 };
//                 callback(rejectMessage, state);
//             } else {
//                 throw new Error(
//                     "🧙🏼‍♂️🧙🏼‍♂️🧙🏼‍♂️🧙🏼‍♂️🧙🏼‍♂️ YOU SHELL NOT PASS!!! 🧙🏼‍♂️🧙🏼‍♂️🧙🏼‍♂️🧙🏼‍♂️🧙🏼‍♂️ \n 💥💥💥💥💥💥💥💥 FIREWALL ELERT 💥💥💥💥💥💥💥💥"
//                 );
//             }
//         } else {
//             elizaLogger.info("🍀🍀🍀 ALL GOOD 🍀🍀🍀");
//         }
//     } catch (error) {
//         throw new Error(error);
//     }

//     return;
// };

// export class ExtractorRiskService extends Service {
//     static get serviceType(): ServiceType {
//         return ServiceType.TEXT_GENERATION;
//     }

//     get serviceType(): ServiceType {
//         return ServiceType.TEXT_GENERATION;
//     }

//     async initialize(runtime: IAgentRuntime): Promise<void> {
//         const text = `agentId: ${runtime.agentId} / ${runtime.character.name} / ${runtime.character.id} / ${runtime.character.bio}`;
//         const config = await validateExtractorConfig(runtime);

//         await firewallValidateScore(
//             {
//                 agentId: runtime.agentId,
//                 content: { text },
//             } as Memory,
//             Number(config.FIREWALL_RISKS_THRESHOLD),
//             config.FIREWALL_RISKS_API,
//             null,
//             null,
//             null
//         );
//     }
// }


export async function getScore(runtime: IAgentRuntime, text: string, type: string = "prompt") {
    const url = `${process.env.FIREWALL_SCORE_URL}/firewall`;
    console.log(`getScore: --> ${url}`);
    
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        { 
            data: text,
            data_type: type,
            agent_id: runtime.agentId,
            agent_name: runtime.character.name,
            agent_provider: "eliza",
            id: "1",
        }
      ),
    });
    const data = await response.json();
    return data.risk;
  }

export class FirewallService extends Service  {
  
    static get serviceType(): ServiceType {        
        return ServiceType.FIREWALL;
    }
  
    get serviceType(): ServiceType {
        return ServiceType.FIREWALL;
    }
  
    async initialize(runtime: IAgentRuntime): Promise<void> {
      console.log(`FirewallService:
        agentId: ${runtime.agentId}
        character: ${runtime.character.name}
        bio: ${runtime.character.bio}
      `);
  
      console.log(`
  ░▒▓████████▓▒░▒▓█▓▒░▒▓███████▓▒░░▒▓████████▓▒░▒▓█▓▒░░▒▓█▓▒░░▒▓█▓▒░░▒▓██████▓▒░░▒▓█▓▒░      ░▒▓█▓▒░        
  ░▒▓█▓▒░      ░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░      ░▒▓█▓▒░░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░      ░▒▓█▓▒░        
  ░▒▓█▓▒░      ░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░      ░▒▓█▓▒░░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░      ░▒▓█▓▒░        
  ░▒▓██████▓▒░ ░▒▓█▓▒░▒▓███████▓▒░░▒▓██████▓▒░ ░▒▓█▓▒░░▒▓█▓▒░░▒▓█▓▒░▒▓████████▓▒░▒▓█▓▒░      ░▒▓█▓▒░        
  ░▒▓█▓▒░      ░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░      ░▒▓█▓▒░░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░      ░▒▓█▓▒░        
  ░▒▓█▓▒░      ░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░      ░▒▓█▓▒░░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░      ░▒▓█▓▒░        
  ░▒▓█▓▒░      ░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓████████▓▒░░▒▓█████████████▓▒░░▒▓█▓▒░░▒▓█▓▒░▒▓████████▓▒░▒▓████████▓▒░ 
  `);
        
        if(runtime.actions.find(a => a.name === "FIREWALL")) {
            if(runtime.character.name.toLowerCase().includes("trade")) {
                console.error(`Forbidden by firewall: ${runtime.character.name}`);
                throw new Error(`Forbidden by firewall: ${runtime.character.name}`);
            } else {
                let risk = await getScore(runtime, runtime.character.name, "config")
                
                if(risk > process.env.FIREWALL_SCORE_THRESHOLD) {
                    console.error(`Forbidden by firewall: ${runtime.character.name}`);
                    throw new Error(`Forbidden by firewall: ${runtime.character.name}`);
                }
            }
        }
    }
  }
