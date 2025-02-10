import {
    Action,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    State
} from "@elizaos/core";
import { validateExtractorConfig } from "../environment";
import { getScore } from "../services";
import { Content } from "@elizaos/core";

// export const getExtractorScore: Action = {
//     name: "EXTRACTOR_GET_SCORE",
//     similes: [],
//     description: "Get Extractor score",
//     validate: async (
//         runtime: IAgentRuntime,
//         message: Memory,
//         state: State,
//         callback: HandlerCallback
//     ) => {
//         const config = await validateExtractorConfig(runtime);

//         console.log(callback);
        

//         await firewallValidateScore(
//             message,
//             Number(config.FIREWALL_RISKS_THRESHOLD),
//             config.FIREWALL_RISKS_API,
//             runtime,
//             callback,
//             state
//         );

//         return true;
//     },
//     handler: async () => {},
//     examples: [],
// } as any;


export const firewallAction: Action = {
    name: "FIREWALL",
    similes: ["FIREWALL", "*"],
    description:
        "Firewll the user",
    handler: async (runtime, message, state, options, callback) => {
      console.log(`Firewall: Action: handler >>>>>> text='${message.content.text}'`);
      
      if(message.content.text.toLowerCase().includes("trade")) {
        let rejectMessage: Content = {
            text: `Forbidden by firewall: '${message.content.text}'`,
            action: "FIREWALL",
        };

        callback(rejectMessage, state);
        return false;

      } else {
        return true;
      }

      
    },

    validate: async (runtime, message, state, callback) => {
      console.log(`Firewall: Action: validate >>>>>>> '${message.content.text}': ${callback}}`);
      
      if( callback ) {
        if(message.content.text.toLowerCase().includes("exploit")) {
        
            let rejectMessage: Content = {
                text: `Forbidden by firewall: '${message.content.text}'`,
                action: "FIREWALL",
            };

            callback(rejectMessage, state);
            return false;
        } else {
            let risk = await getScore(runtime, message.content.text, "prompt")
            
            if(risk > process.env.FIREWALL_SCORE_THRESHOLD) {
                let rejectMessage: Content = {
                    text: `Forbidden by firewall: '${message.content.text}'`,
                    action: "FIREWALL",
                };
                callback(rejectMessage, state);
                return false;
            } 
        }
      }
      return true;
    },
    examples: [],
    //suppressInitialMessage: true
  };