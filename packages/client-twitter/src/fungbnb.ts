import { UserManager, ConsensusProvider } from "@elizaos/plugin-data-enrich";
import {
    elizaLogger,
    generateText,
    IAgentRuntime,
    ModelClass,
} from "@elizaos/core";
import { ClientBase } from "./base";

export const KEY_BNB_CACHE_STR = "key_bnb_res_cache_";

export class CoinAnaObj {
    public coin_analysis: string;
    public coin_prediction: string;
    public timestamp: number;
    public token: string;
    constructor(token: string, analysis: string, prediction: string) {
        this.token = token;
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
    async extractBraceContent(input: string): Promise<string> {
        const regex = /\{.*\}/;
        const match = input.match(regex);
        return match ? match[0] : '';
    }

    async bnbQuery(coinsymbol: string, userId: any) {
        console.log("handleBnbQuery 1, in fungbnb.");
        // 1. get param. 2 get prompt. 3. get tweet info. 4. get bnb info. 5. get ai answer.
        const prompt = "Suppose you are a cryptocurrency expert with rich cryptocurrency trading experience and are frequently active in various cryptocurrency communities. Regarding the following cryptocurrency: " +
        coinsymbol +", please use 100 - word English texts respectively to analyze the reasons for the current price trend and make predictions. The response format should be formatted as a JSON block as follows: { \"token\": \"{token}\", \"coin_analysis\": \"{coin_analysis}\", \"coin_prediction\": \"{coin_prediction}\" }. No other text should be provided, No need to use markdown syntax, just return JSON directly.";
        // todo: query the bnb.
        console.log("handleBnbQuery 2, in fungbnb. prompt[" + prompt + "]");

        let responseStr = await generateText({
            runtime: this.runtime,
            context: prompt,
            modelClass: ModelClass.LARGE,
        });
        console.log("handleBnbQuery 3, in fungbnb. responseStr: ", responseStr);

        let responseObj = null;

        try {
            //const trimstr = await this.extractBraceContent(responseStr);
            //console.log("handleBnbQuery 3.3, in fungbnb. trimstr: ", trimstr);

            responseObj = JSON.parse(responseStr);
            console.log("handleBnbQuery 4, in fungbnb. responseObj string: ", JSON.stringify(responseObj));
        } catch (error) {
            responseObj = null;
            console.error('JSON parse error: ', error.message);
        }
        if (responseObj) {
            const anaobj = new CoinAnaObj(coinsymbol, responseObj?.coin_analysis, responseObj?.coin_prediction);
            await this.runtime.cacheManager.set(KEY_BNB_CACHE_STR + coinsymbol, JSON.stringify(anaobj));
        }
    }
}
