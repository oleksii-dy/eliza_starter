import { Plugin } from "@elizaos/eliza";
import generateMusic from "./actions/generate";
import extendMusic from "./actions/extend";
import { UdioProvider, udioProvider } from "./providers/udio";

export {
    UdioProvider,
    generateMusic as GenerateMusic,
    extendMusic as ExtendMusic,
};

export const udioPlugin: Plugin = {
    name: "udio",
    description: "Udio AI Music Generation Plugin for Eliza",
    actions: [generateMusic, extendMusic],
    evaluators: [],
    providers: [udioProvider],
};

export default udioPlugin;