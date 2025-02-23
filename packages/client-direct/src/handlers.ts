import express from "express";
import * as path from "path";
import { REST, Routes } from "discord.js";

import {
    AgentRuntime,
    stringToUuid,
    Media,
    getEmbeddingZeroVector,
    Content,
    Memory,
    ModelClass,
    composeContext,
    generateMessageResponse,
    State,
    generateCaption,
    generateImage,
    ServiceType,
} from "@elizaos/core";

import { DirectClient } from "./client";
import { NoResponseError, NoTextError } from "./errors";
import { messageHandlerTemplate } from "./templates";
import { CustomRequest } from "./types";
import { ISpeechService } from "@elizaos/core";

export async function handleMessage(
    req: express.Request,
    res: express.Response,
    directClient: DirectClient
) {
    const { runtime, message, response, messageId } =
        await processTextualRequest(req, directClient);

    respondWithMessage(runtime, message, res, response, messageId);
}

export async function handleWhisper(
    req: CustomRequest,
    res: express.Response,
    directClient: DirectClient
) {
    const audioFile = req.file; // Access the uploaded file using req.file
    const agentId = req.params.agentId;

    if (!audioFile) {
        res.status(400).send("No audio file provided");
        return;
    }

    const runtime = directClient.getRuntime(agentId);

    const formData = new FormData();
    const audioBlob = new Blob([audioFile.buffer], {
        type: audioFile.mimetype,
    });
    formData.append("file", audioBlob, audioFile.originalname);
    formData.append("model", "whisper-1");

    const response = await fetch(
        "https://api.openai.com/v1/audio/transcriptions",
        {
            method: "POST",
            headers: {
                Authorization: `Bearer ${runtime.token}`,
            },
            body: formData,
        }
    );

    const data = await response.json();
    res.json(data);
}

export async function handleSpeak(
    req: express.Request,
    res: express.Response,
    directClient: DirectClient
) {
    const { response, runtime } = await processTextualRequest(
        req,
        directClient
    );

    const speechService = runtime.getService<ISpeechService>(
        ServiceType.SPEECH_GENERATION
    );
    const responseStream = await speechService.generate(runtime, response.text);

    if (!responseStream) {
        res.status(500).send("Failed to generate speech");
        return;
    }

    res.set({
        "Content-Type": "audio/mpeg",
        // 'Transfer-Encoding': 'chunked'
    });

    responseStream.pipe(res);
}

export async function handleImage(
    req: express.Request,
    res: express.Response,
    directClient: DirectClient
) {
    const agentId = req.params.agentId;
    const agent = directClient.getAgent(agentId);
    if (!agent) {
        res.status(404).send("Agent not found");
        return;
    }

    const images = await generateImage({ ...req.body }, agent);
    const imagesRes: { image: string; caption: string }[] = [];
    if (images.data && images.data.length > 0) {
        for (let i = 0; i < images.data.length; i++) {
            const caption = await generateCaption(
                { imageUrl: images.data[i] },
                agent
            );
            imagesRes.push({
                image: images.data[i],
                caption: caption.title,
            });
        }
    }
    res.json({ images: imagesRes });
}

export async function handleGetChannels(
    req: express.Request,
    res: express.Response,
    directClient: DirectClient
) {
    const runtime = directClient.getRuntime(req.params.agentId);

    const API_TOKEN = runtime.getSetting("DISCORD_API_TOKEN") as string;
    const rest = new REST({ version: "10" }).setToken(API_TOKEN);

    const guilds = (await rest.get(Routes.userGuilds())) as Array<any>;

    res.json({
        id: runtime.agentId,
        guilds,
        serverCount: guilds.length,
    });
}

function respondWithMessage(
    runtime: AgentRuntime,
    message: Content,
    res: express.Response<any, Record<string, any>>,
    response: Content,
    messageId: string
) {
    const action = runtime.actions.find((a) => a.name === response.action);
    const shouldSuppressInitialMessage = action?.suppressInitialMessage;

    if (shouldSuppressInitialMessage) {
        if (message) {
            res.json([
                {
                    ...message,
                    id: messageId,
                },
            ]);
        } else {
            res.json([]);
        }
    } else {
        if (message) {
            res.json([
                {
                    ...response,
                    id: messageId,
                },
                message,
            ]);
        } else {
            res.json([
                {
                    ...response,
                    id: messageId,
                },
            ]);
        }
    }
}

function collectAttachments(req: express.Request) {
    const attachments: Media[] = [];
    if (req.file) {
        const filePath = path.join(
            process.cwd(),
            "data",
            "uploads",
            req.file.filename
        );
        attachments.push({
            id: Date.now().toString(),
            url: filePath,
            title: req.file.originalname,
            source: "direct",
            description: `Uploaded file: ${req.file.originalname}`,
            text: "",
            contentType: req.file.mimetype,
        });
    }

    return attachments;
}

async function genResponse(runtime: AgentRuntime, state: State) {
    const context = composeContext({
        state,
        template: messageHandlerTemplate,
    });

    const response = await generateMessageResponse({
        runtime: runtime,
        context,
        modelClass: ModelClass.LARGE,
    });

    if (!response) {
        throw new NoResponseError();
    }

    return response;
}

function genRoomId(req: express.Request) {
    return stringToUuid(
        req.body.roomId ?? "default-room-" + req.params.agentId
    );
}

function genUserId(req: express.Request) {
    return stringToUuid(req.body.userId ?? "user");
}

function extractTextFromRequest(req: express.Request) {
    const text = req.body.text;

    if (!text) {
        throw new NoTextError();
    }

    return text;
}

function composeContent(req: express.Request): Content {
    const text = extractTextFromRequest(req);
    const attachments = collectAttachments(req);

    return {
        text,
        attachments,
        source: "direct",
        inReplyTo: undefined,
    };
}

async function processTextualRequest(req, directClient: DirectClient) {
    const roomId = genRoomId(req);
    const userId = genUserId(req);
    const runtime = directClient.getRuntime(req.params.agentId);
    const agentId = runtime.agentId;

    await runtime.ensureConnection(
        userId,
        roomId,
        req.body.userName,
        req.body.name,
        "direct"
    );

    const content = composeContent(req);
    const userMessage = {
        content,
        userId,
        roomId,
        agentId,
    };

    const messageId = stringToUuid(Date.now().toString());
    const memory: Memory = {
        id: stringToUuid(messageId + "-" + userId),
        ...userMessage,
        createdAt: Date.now(),
    };

    await runtime.messageManager.addEmbeddingToMemory(memory);
    await runtime.messageManager.createMemory(memory);

    let state = await runtime.composeState(userMessage, {
        agentName: runtime.character.name,
    });

    const response = await genResponse(runtime, state);

    const responseMessage: Memory = {
        id: stringToUuid(messageId + "-" + agentId),
        ...userMessage,
        userId: agentId,
        content: response,
        embedding: getEmbeddingZeroVector(),
        createdAt: Date.now(),
    };

    await runtime.messageManager.createMemory(responseMessage);

    state = await runtime.updateRecentMessageState(state);

    let message = null as Content | null;

    await runtime.processActions(
        memory,
        [responseMessage],
        state,
        async (newMessages) => {
            message = newMessages;
            return [memory];
        }
    );
    await runtime.evaluate(memory, state);

    return { runtime, memory, state, message, response, messageId };
}
