import express from "express";
import { getEnvVariable } from "@elizaos/core";

import { DirectClient } from ".";
import { CustomRequest } from "./types";
import {
    handleImage,
    handleMessage,
    handleSpeak,
    handleWhisper,
    handleGetChannels,
} from "./handlers";

export function createApiRouter(directClient: DirectClient) {
    const router = express.Router();
    const upload = directClient.upload;

    router.use(
        express.json({
            limit: getEnvVariable("EXPRESS_MAX_PAYLOAD") || "100kb",
        })
    );

    router.get("/", (_, res) => {
        res.send("Welcome, this is the REST API!");
    });

    router.get("/hello", (_, res) => {
        res.json({ message: "Hello World!" });
    });

    router.get("/agents", (_, res) => {
        const agents = directClient.getAgents();
        const agentsList = Array.from(agents.values()).map((agent) => ({
            id: agent.agentId,
            name: agent.character.name,
            clients: Object.keys(agent.clients),
        }));
        res.json({ agents: agentsList });
    });

    router.get("/agents/:agentId/channels", async (req, res) => {
        await handleGetChannels(req, res, directClient);
    });

    router.post(
        "/:agentId/message",
        upload.single("file"),
        async (req: express.Request, res: express.Response) => {
            await handleMessage(req, res, directClient);
        }
    );

    router.post(
        "/:agentId/whisper",
        upload.single("file"),
        async (req: CustomRequest, res: express.Response) => {
            await handleWhisper(req, res, directClient);
        }
    );

    router.post(
        "/:agentId/image",
        async (req: express.Request, res: express.Response) => {
            await handleImage(req, res, directClient);
        }
    );

    router.post("/:agentId/speak", async (req, res) => {
        await handleSpeak(req, res, directClient);
    });

    return router;
}
