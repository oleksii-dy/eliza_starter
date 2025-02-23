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
} from "@elizaos/core";

import { DirectClient } from "./client";
import { AgentNotFound, NoResponseError } from "./errors";
import { messageHandlerTemplate } from "./templates";
import { CustomRequest } from "./types";

export async function handleMessage(
    req: express.Request,
    res: express.Response,
    directClient: DirectClient
) {
    console.log("message", req.body);

    const agentId = req.params.agentId;
    const roomId = stringToUuid(req.body.roomId ?? "default-room-" + agentId);
    const userId = stringToUuid(req.body.userId ?? "user");
    const runtime = directClient.getRuntime(agentId);

    await runtime.ensureConnection(
        userId,
        roomId,
        req.body.userName,
        req.body.name,
        "direct"
    );

    const attachments = collectAttachments(req);

    const content: Content = {
        text: req.body.text,
        attachments,
        source: "direct",
        inReplyTo: undefined,
    };

    const userMessage = {
        content,
        userId,
        roomId,
        agentId: runtime.agentId,
    };

    const messageId = stringToUuid(Date.now().toString());

    console.log("userMessage", userMessage);
    console.log("messageId", messageId);
    console.log("userId", userId);
    console.log("roomId", roomId);
    console.log("content", content);

    const memory: Memory = {
        id: stringToUuid(messageId + "-" + userId),
        ...userMessage,
        agentId: runtime.agentId,
        userId,
        roomId,
        content,
        createdAt: Date.now(),
    };

    await runtime.messageManager.addEmbeddingToMemory(memory);
    await runtime.messageManager.createMemory(memory);

    let state = await runtime.composeState(userMessage, {
        agentName: runtime.character.name,
    });

    const response = await genResponse(runtime, state);

    const responseMessage: Memory = {
        id: stringToUuid(messageId + "-" + runtime.agentId),
        ...userMessage,
        userId: runtime.agentId,
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
    const agentId = req.params.agentId;
    const roomId = stringToUuid(req.body.roomId ?? "default-room-" + agentId);
    const userId = stringToUuid(req.body.userId ?? "user");
    const text = req.body.text;

    if (!text) {
        res.status(400).send("No text provided");
        return;
    }

    const runtime = directClient.getRuntime(agentId);

    try {
        // Process message through agent (same as /message endpoint)
        await runtime.ensureConnection(
            userId,
            roomId,
            req.body.userName,
            req.body.name,
            "direct"
        );

        const messageId = stringToUuid(Date.now().toString());

        const content: Content = {
            text,
            attachments: [],
            source: "direct",
            inReplyTo: undefined,
        };

        const userMessage = {
            content,
            userId,
            roomId,
            agentId: runtime.agentId,
        };

        const memory: Memory = {
            id: messageId,
            agentId: runtime.agentId,
            userId,
            roomId,
            content,
            createdAt: Date.now(),
        };

        await runtime.messageManager.createMemory(memory);

        const state = await runtime.composeState(userMessage, {
            agentName: runtime.character.name,
        });

        const response = await genResponse(runtime, state);

        // save response to memory
        const responseMessage = {
            ...userMessage,
            userId: runtime.agentId,
            content: response,
        };

        await runtime.messageManager.createMemory(responseMessage);

        if (!response) {
            res.status(500).send("No response from generateMessageResponse");
            return;
        }

        await runtime.evaluate(memory, state);

        const _result = await runtime.processActions(
            memory,
            [responseMessage],
            state,
            async () => {
                return [memory];
            }
        );

        // Get the text to convert to speech
        const textToSpeak = response.text;

        // Convert to speech using ElevenLabs
        const elevenLabsApiUrl = `https://api.elevenlabs.io/v1/text-to-speech/${process.env.ELEVENLABS_VOICE_ID}`;
        const apiKey = process.env.ELEVENLABS_XI_API_KEY;

        if (!apiKey) {
            throw new Error("ELEVENLABS_XI_API_KEY not configured");
        }

        const speechResponse = await fetch(elevenLabsApiUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "xi-api-key": apiKey,
            },
            body: JSON.stringify({
                text: textToSpeak,
                model_id:
                    process.env.ELEVENLABS_MODEL_ID || "eleven_multilingual_v2",
                voice_settings: {
                    stability: parseFloat(
                        process.env.ELEVENLABS_VOICE_STABILITY || "0.5"
                    ),
                    similarity_boost: parseFloat(
                        process.env.ELEVENLABS_VOICE_SIMILARITY_BOOST || "0.9"
                    ),
                    style: parseFloat(
                        process.env.ELEVENLABS_VOICE_STYLE || "0.66"
                    ),
                    use_speaker_boost:
                        process.env.ELEVENLABS_VOICE_USE_SPEAKER_BOOST ===
                        "true",
                },
            }),
        });

        if (!speechResponse.ok) {
            throw new Error(
                `ElevenLabs API error: ${speechResponse.statusText}`
            );
        }

        const audioBuffer = await speechResponse.arrayBuffer();

        // Set appropriate headers for audio streaming
        res.set({
            "Content-Type": "audio/mpeg",
            // 'Transfer-Encoding': 'chunked'
        });

        res.send(Buffer.from(audioBuffer));
    } catch (error) {
        console.error("Error processing message or generating speech:", error);
        res.status(500).json({
            error: "Error processing message or generating speech",
            details: error.message,
        });
    }
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
    const agentId = req.params.agentId;
    const runtime = directClient.getAgent(agentId);

    if (!runtime) {
        res.status(404).json({ error: "Runtime not found" });
        return;
    }

    const API_TOKEN = runtime.getSetting("DISCORD_API_TOKEN") as string;
    const rest = new REST({ version: "10" }).setToken(API_TOKEN);

    try {
        const guilds = (await rest.get(Routes.userGuilds())) as Array<any>;

        res.json({
            id: runtime.agentId,
            guilds: guilds,
            serverCount: guilds.length,
        });
    } catch (error) {
        console.error("Error fetching guilds:", error);
        res.status(500).json({ error: "Failed to fetch guilds" });
    }
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
