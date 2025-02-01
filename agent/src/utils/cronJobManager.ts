import cron from "node-cron"

import {suimarketPlugin} from "@elizaos/plugin-suimarket"

import { elizaLogger, IAgentRuntime, Memory, Provider, State } from '@elizaos/core';
import {RedisClient} from '@elizaos/adapter-redis'
let cronTask;
const redisClient = new RedisClient(process.env.REDIS_URL);

export const startCronJobs = () => {
    if (cronTask) cronTask.stop(); // Dừng job cũ nếu có

    const cronTopDexProvider = suimarketPlugin.providers[0];

    cronTask = cron.schedule('*/5 * * * *', async () => {
        try {
            let runtime: IAgentRuntime;
            let message: Memory;
            let result = await cronTopDexProvider.get(runtime, message);
            redisClient.setValue({ key: "TOP_DEX", value: JSON.stringify(result) });
            elizaLogger.success("Top_dex_cronjob_5min");
        } catch (error) {
            elizaLogger.error("Fail_Top_dex:", error);
        }
    });

    console.log("Cron job restarted");
};