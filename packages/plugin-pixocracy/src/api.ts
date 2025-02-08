import express from "express";

import { IAgentRuntime } from "@elizaos/core";
import { createPixocracyDialogue } from "./handlers/createPixocracyDialogue.ts";

export function createPixocracyApiRouter(
    runtime: IAgentRuntime
): express.Router {
    const router = express.Router();
    router.use(express.json());

    // Health check
    router.get("/api/pixocracy/health", async (req: express.Request, res: express.Response) => {
        res.json({
            success: true,
            data: "Eliza is healthy",
        });
    });

    router.post(
        "/api/pixocracy/converse",
        async (req: express.Request, res: express.Response) => {
            try {
                const pixocracyRes = await createPixocracyDialogue({
                    runtime,
                    req,
                });

                res.json({
                    success: true,
                    data: pixocracyRes,
                });
            } catch (e: any) {
                console.log(e);
                res.json({
                    success: false,
                    data: JSON.stringify(e),
                });
            }
        }
    );

    return router;
}
