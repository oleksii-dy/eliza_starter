import cron from "node-cron"

import {suimarketPlugin} from "@elizaos/plugin-suimarket"

import { elizaLogger, IAgentRuntime, Memory, Provider, State } from '@elizaos/core';
import {RedisClient} from '@elizaos/adapter-redis'
export const startCronJobs = () => {
    // every 5 min run
    const redisClient = new RedisClient(process.env.REDIS_URL);
    const cronTopDexProvider = suimarketPlugin.providers[0];
    cron.schedule('*/5 * * * *', async () => {
        try {
            let runtime:IAgentRuntime;
            let message:Memory;
            let result = await cronTopDexProvider.get(runtime, message)
            redisClient.setValue({ key: "TOP_DEX", value: JSON.stringify(result) })
            console.log("Top_dex_cronjob_5min");
        } catch (error) {
            console.log("Fail_Top_dex:", error);
        }

    });
    // cron.schedule('* * * * *', () => {
    //     elizaLogger.success("Cron job chạy mỗi 1 phút");
    // });
};