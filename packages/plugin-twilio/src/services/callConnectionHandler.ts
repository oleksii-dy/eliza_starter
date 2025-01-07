import { WebSocket } from "ws";
import { Readable } from "stream";
import * as Echogarden from "echogarden";
import { getWavHeader } from "./audioUtils";

interface TwilioMessage {
    event: string;
    start?: {
        streamSid: string;
        callSid: string;
    };
    media?: {
        track: number;
        chunk: number;
        timestamp: number;
        payload: string;
    };
}

async function streamToArrayBuffer(readableStream: Readable): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        readableStream.on("data", (chunk) => chunks.push(chunk));
        readableStream.on("end", () => resolve(Buffer.concat(chunks).buffer));
        readableStream.on("error", reject);
    });
}

async function generateVitsAudio(text: string): Promise<Buffer> {
    const { audio } = await Echogarden.synthesize(text, {
        engine: "vits",
        voice: process.env.VITS_VOICE,
    });

    if (audio instanceof Buffer) {
        return audio;
    }

    if ("audioChannels" in audio && "sampleRate" in audio) {
        const floatBuffer = Buffer.from(audio.audioChannels[0].buffer);
        const floatArray = new Float32Array(floatBuffer.buffer);
        const pcmBuffer = new Int16Array(floatArray.length);

        for (let i = 0; i < floatArray.length; i++) {
            pcmBuffer[i] = Math.round(floatArray[i] * 32767);
        }

        const wavHeaderBuffer = getWavHeader(
            pcmBuffer.length * 2,
            audio.sampleRate,
            1,
            16
        );

        return Buffer.concat([
            wavHeaderBuffer,
            Buffer.from(pcmBuffer.buffer)
        ]);
    }

    throw new Error("Unsupported audio format");
}

async function textToSpeech(text: string): Promise<Buffer> {
    const apiKey = process.env.ELEVENLABS_XI_API_KEY;
    const voiceId = process.env.ELEVENLABS_VOICE_ID;

    if (!apiKey || !voiceId) {
        return await generateVitsAudio(text);
    }

    try {
        const response = await fetch(
            `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "xi-api-key": apiKey,
                },
                body: JSON.stringify({
                    model_id: process.env.ELEVENLABS_MODEL_ID || "eleven_monolingual_v1",
                    text: text,
                    voice_settings: {
                        stability: parseFloat(process.env.ELEVENLABS_VOICE_STABILITY || "0.5"),
                        similarity_boost: parseFloat(process.env.ELEVENLABS_VOICE_SIMILARITY_BOOST || "0.9"),
                        style: parseFloat(process.env.ELEVENLABS_VOICE_STYLE || "0.66"),
                        use_speaker_boost: process.env.ELEVENLABS_VOICE_USE_SPEAKER_BOOST === "true",
                    },
                }),
            }
        );

        if (!response.ok) {
            const errorBody = await response.json();

            if (response.status === 401 && errorBody.detail?.status === "quota_exceeded") {
                console.log("ElevenLabs quota exceeded, falling back to VITS");
                return await generateVitsAudio(text);
            }

            throw new Error(`ElevenLabs API error: ${response.statusText}`);
        }

        const chunks: Buffer[] = [];
        const reader = response.body!.getReader();
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(Buffer.from(value));
        }
        return Buffer.concat(chunks);

    } catch (error) {
        console.error("ElevenLabs error:", error);
        return await generateVitsAudio(text);
    }
}

export async function handleCallConnection(
    ws: WebSocket,
    runtime: any,
    userId: string,
    roomId: string
) {
    ws.on("message", async (data: string) => {
        try {
            const message: TwilioMessage = JSON.parse(data);

            if (message.event === "start" && message.start) {
                const streamSid = message.start.streamSid;

                await runtime.ensureConnection(
                    userId,
                    roomId,
                    "Phone User",
                    "Phone",
                    "direct"
                );

                const userMessage = {
                    content: { text: "Incoming call" },
                    userId,
                    roomId,
                    agentId: runtime.agentId,
                };

                const state = await runtime.composeState(userMessage);
                const response = await runtime.generateResponse(state);

                if (!response?.content?.text) {
                    throw new Error("No response generated");
                }

                const audioBuffer = await textToSpeech(response.content.text);

                ws.send(
                    JSON.stringify({
                        streamSid,
                        event: "media",
                        media: {
                            payload: audioBuffer.toString("base64"),
                        },
                    })
                );

                ws.send(
                    JSON.stringify({
                        streamSid,
                        event: "stop",
                    })
                );
            }
        } catch (error) {
            console.error("Error in call connection:", error);
            ws.close();
        }
    });

    ws.on("error", (error) => {
        console.error("WebSocket error:", error);
        ws.close();
    });

    ws.on("close", () => {
        console.log("Call connection closed");

        // summary of the call and the save this to memory?
    });
} 