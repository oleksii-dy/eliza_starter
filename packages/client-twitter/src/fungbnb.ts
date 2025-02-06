import { UserManager, ConsensusProvider } from "@elizaos/plugin-data-enrich";
import {
    elizaLogger,
    generateText,
    IAgentRuntime,
    ModelClass,
} from "@elizaos/core";
import { ClientBase } from "./base";

export const KEY_BNB_CACHE_STR = "key_bnb_res_cache";

export class CoinAnaObj {
    public coin_analysis: string;
    public coin_prediction: string;
    public timestamp: number;
    constructor(analysis: string, prediction: string) {
        this.coin_analysis = analysis;
        this.coin_prediction = prediction;
        this.timestamp = Date.now();
    }
}

export class FungBnbClient {
    client: ClientBase;
    runtime: IAgentRuntime;
    consensus: ConsensusProvider;
    // inferMsgProvider: InferMessageProvider;
    userManager: UserManager;

    constructor(client: ClientBase, runtime: IAgentRuntime) {
        this.client = client;
        this.runtime = runtime;
        this.consensus = new ConsensusProvider(this.runtime);
        // this.inferMsgProvider = new InferMessageProvider(
        //     this.runtime.cacheManager
        // );
        this.userManager = new UserManager(this.runtime.cacheManager);
        this.sendingTwitterDebug = false;
    }

    intervalId: NodeJS.Timeout;
    sendingTwitterDebug: boolean;

    async start() {
        console.log("Bnb Query start");
        if (!this.client.profile) {
            await this.client.init();
        }
        this.consensus.startNode();
    }
    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    async bnbQuery(tweed: string, userId: any) {
        console.log("handleBnbQuery 1, in fungbnb.");
        // 1. get prama. 2 get prompt. 3. get tweet info.
        const prompt = "predict coin price." + tweed;
        // todo: query the bnb.
        console.log("handleBnbQuery 2, in fungbnb. prompt: ", prompt);
        await this.sleep(3000);

        // let responseStr = await generateText({
        //     // ai .
        //     runtime: this.runtime,
        //     context: prompt,
        //     modelClass: ModelClass.LARGE,
        // });

        // console.log("handleBnbQuery 3, in fungbnb. responseStr: ", responseStr);

        // let responseObj = JSON.parse(responseStr);

        // const { resultText } = responseObj;
        // console.log("handleBnbQuery 4, in fungbnb. resultText: ", resultText);

        // cache the resultText to ring buffer.
        const anaobj = new CoinAnaObj("External factors such as the Czech Republic’s proposal to allocate a portion of its national reserves to Bitcoin could be a significant bullish catalyst. This, alongside institutional interest and growing acceptance of Bitcoin in official reserves, could drive more upward momentum"
            , "If Bitcoin can stabilize above $97000 and break through the current technical resistance level (around $101000 to $105000), it may see a price increase in the next month, challenging new historical highs.");
        await this.runtime.cacheManager.set(KEY_BNB_CACHE_STR, JSON.stringify(anaobj));
        const cached = await this.runtime.cacheManager.get(KEY_BNB_CACHE_STR);
        console.log("handleBnbQuery 3, in fungbnb. cached: " + cached);
    }
}
