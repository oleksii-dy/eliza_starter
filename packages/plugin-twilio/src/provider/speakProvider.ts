import { ActionProvider } from "@magickml/core";
import { getWavHeader } from "../services/audioUtils";
import * as Echogarden from "echogarden";

export const speakProvider: ActionProvider = {
    name: "speak",
    execute: async ({ agent, event, output }) => {
        try {
            const text = output.content.text;
            const apiKey = process.env.ELEVENLABS_XI_API_KEY;
            const voiceId = process.env.ELEVENLABS_VOICE_ID;

            if (!apiKey) {
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
                            model_id:
                                process.env.ELEVENLABS_MODEL_ID ||
                                "eleven_monolingual_v1",
                            text: text,
                            voice_settings: {
                                stability: parseFloat(
                                    process.env.ELEVENLABS_VOICE_STABILITY ||
                                        "0.5"
                                ),
                                similarity_boost: parseFloat(
                                    process.env
                                        .ELEVENLABS_VOICE_SIMILARITY_BOOST ||
                                        "0.9"
                                ),
                                style: parseFloat(
                                    process.env.ELEVENLABS_VOICE_STYLE || "0.66"
                                ),
                                use_speaker_boost:
                                    process.env
                                        .ELEVENLABS_VOICE_USE_SPEAKER_BOOST ===
                                    "true",
                            },
                        }),
                    }
                );

                if (!response.ok) {
                    const errorBody = await response.json();

                    // Check for quota exceeded error
                    if (
                        response.status === 401 &&
                        errorBody.detail?.status === "quota_exceeded"
                    ) {
                        console.log(
                            "ElevenLabs quota exceeded, falling back to VITS"
                        );
                        return await generateVitsAudio(text);
                    }

                    throw new Error(
                        `ElevenLabs API error: ${response.statusText}`
                    );
                }

                // Convert the response to a buffer for Twilio
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
        } catch (error) {
            console.error("Error in speak provider:", error);
            throw error;
        }
    },
};

async function generateVitsAudio(text: string): Promise<Buffer> {
    const { audio } = await Echogarden.synthesize(text, {
        engine: "vits",
        voice: process.env.VITS_VOICE || "en_US-hfc_female-medium",
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

        return Buffer.concat([wavHeaderBuffer, Buffer.from(pcmBuffer.buffer)]);
    }

    throw new Error("Unsupported audio format");
}
