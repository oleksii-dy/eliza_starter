import { type Plugin } from "@elizaos/core";
import generateMusic from "./actions/generate";
import extendMusic from "./actions/extend";
import { UdioProvider } from "./providers/udio";

export {
    UdioProvider,
    generateMusic as GenerateMusic,
    extendMusic as ExtendMusic
};

export const udioPlugin: Plugin = {
    name: "udio",
    description: "Udio AI Music Generation Plugin for Eliza",
    actions: [generateMusic, extendMusic],
    evaluators: [],
    providers: [UdioProvider.get],
};

export default udioPlugin;