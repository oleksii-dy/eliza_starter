import {
    settings,
    elizaLogger,
    ICharacterConfigLoader,
} from "@elizaos/core";
import {
    getRoochNodeUrl,
    NetworkType,
    RoochClient
} from '@roochnetwork/rooch-sdk/dist/esm';
import {
    parseAccessPath,
} from "../utils";
import { decodeCharacterData } from "../moves/foc_eliza"

export const characterConfigLoader: ICharacterConfigLoader = {
    match : (uri: string):boolean => {
        if (uri.startsWith("rooch://")) {
            return true
        }

        return false;
    },
    load: async (uri: string) : Promise<any> => {
        const accessPath = parseAccessPath(uri);

        try {
            const url = getRoochNodeUrl(settings["ROOCH_NETWORK"] as NetworkType);
            elizaLogger.info(
                `getRoochNodeUrl:  ${url}`
            );

            const roochClient = new RoochClient({ url: url })
            const objectStates = await roochClient.getStates({
                accessPath: accessPath,
                stateOption: {
                    decode: true,
                }
            })

            elizaLogger.debug(
                `getStates result:`, JSON.stringify(objectStates)
            );

            if (!objectStates || objectStates.length==0) {
                throw new Error(`Not found character with uri: ${uri}`)
            }

            const characterData = decodeCharacterData(objectStates[0].decoded_value.value) as any;
            if (characterData) {
                characterData.settings = {}
            }

            return characterData
        } catch (error) {
            console.error("Error in wallet provider:", error);
            return error;
        }
    }
};
