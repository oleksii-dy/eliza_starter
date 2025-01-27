import { Plugin } from "@elizaos/core";
import { continueAction } from "./actions/continue.ts";
import { followRoomAction } from "./actions/followRoom.ts";
import { ignoreAction } from "./actions/ignore.ts";
import { muteRoomAction } from "./actions/muteRoom.ts";
import { noneAction } from "./actions/none.ts";
import { unfollowRoomAction } from "./actions/unfollowRoom.ts";
import { unmuteRoomAction } from "./actions/unmuteRoom.ts";
import  transferToken  from "./actions/transfer.ts";
import { factEvaluator } from "./evaluators/fact.ts";
import { goalEvaluator } from "./evaluators/goal.ts";
import { boredomProvider } from "./providers/boredom.ts";
import { factsProvider } from "./providers/facts.ts";
import { timeProvider } from "./providers/time.ts";
import { WalletProvider, walletProvider } from "./providers/wallet.ts";

export * as actions from "./actions";
export * as evaluators from "./evaluators";
export * as providers from "./providers";

export { WalletProvider, transferToken as TransferMinaToken };

export const minaPlugin: Plugin = {
    name: "mina",
    description: "MINA protocol integration plugin for ElizaOS",
    actions: [
        transferToken,
        // continueAction,
        // followRoomAction,
        // unfollowRoomAction,
        // ignoreAction,
        // noneAction,
        // muteRoomAction,
        // unmuteRoomAction,
    ],
    // evaluators: [factEvaluator, goalEvaluator],
    evaluators: [],
    // providers: [walletProvider, boredomProvider, timeProvider, factsProvider],
    providers: [walletProvider],
};
export default minaPlugin;
