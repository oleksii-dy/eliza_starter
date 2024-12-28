import WebSocket from "ws";
import {
    elizaLogger,
    HandlerCallback,
    IAgentRuntime,
    Service,
    ServiceType,
} from "@elizaos/core";

interface ChatResponse {
    answer: string;
    chat_id: string;
    representation?: Record<string, any>[];
    agent_api_name: string;
    query_summary: string;
    agent_credits: number;
    credits_available: number;
}

interface FereMessage {
    message: string;
    stream?: boolean;
    agent: string;
}

interface FereResponse {
    success: boolean;
    data?: ChatResponse;
    error?: string;
}

export class FereProService extends Service {
    static serviceType = ServiceType.TEXT_GENERATION;
    private ws: WebSocket | null = null;
    private runtime: IAgentRuntime | null = null;
    private config: {
        FERE_USER_ID: string;
        FERE_API_KEY: string;
    } | null = null;
    private debugMode: boolean | null = null;

    async initialize(runtime: IAgentRuntime): Promise<void> {
        console.log("Initializing FerePro WebSocket Service");
        this.runtime = runtime;
        this.debugMode =
            this.runtime.getSetting("FERE_DEBUG") === "true" ? true : false;
        try {
            this.config = {
                FERE_USER_ID:
                    runtime.getSetting("FERE_USER_ID") ||
                    process.env.FERE_USER_ID,
                FERE_API_KEY:
                    runtime.getSetting("FERE_API_KEY") ||
                    process.env.FERE_API_KEY,
            };
            console.log("FerePro configuration loaded:");
        } catch (error) {
            console.error(
                "Failed to load FerePro configuration:",
                error.message
            );
            throw error;
        }
    }

    /* Connect to WebSocket and send a message */
    async sendMessage(
        payload: FereMessage,
        callback: HandlerCallback
    ): Promise<any> {
        return new Promise((resolve, reject) => {
            try {
                const url = `wss://api.fereai.xyz/chat/v2/ws/${this.config.FERE_USER_ID}?X-FRIDAY-KEY=${this.config.FERE_API_KEY}`;
                this.ws = new WebSocket(url);

                this.ws.on("open", () => {
                    console.log("Connected to FerePro WebSocket");
                    this.ws?.send(JSON.stringify(payload));
                    console.log("Message sent:", payload.message);
                });

                this.ws.on("message", (data) => {
                    try {
                        const response = JSON.parse(data.toString());
                        if (response?.chunk) {
                            callback({
                                text: "Response received from FerePro.",
                                content: response,
                            });
                        } else if (response?.answer) {
                            const chatResponse: ChatResponse = {
                                answer: response.answer,
                                chat_id: response.chat_id,
                                representation: response.representation || null,
                                agent_api_name: response.agent_api_name,
                                query_summary: response.query_summary,
                                agent_credits: response.agent_credits,
                                credits_available: response.credits_available,
                            };
                            callback({
                                text: "Response received from FerePro.",
                                content: chatResponse,
                            });
                        } else if (this.debugMode) {
                            // Log intermediate responses
                            elizaLogger.log("Intermediate Response:", response);
                        }

                        elizaLogger.log("Received ChatResponse:", response);
                    } catch (err) {
                        console.error("Error parsing response:", err);
                        reject();
                    }
                });

                this.ws.on("close", () => {
                    resolve("Websocket Closed");
                    console.log("Disconnected from FerePro WebSocket");
                });

                this.ws.on("error", (err) => {
                    console.error("WebSocket error:", err);
                    reject({
                        success: false,
                        error: err.message,
                    });
                });
            } catch (error) {
                reject({
                    success: false,
                    error:
                        error instanceof Error
                            ? error.message
                            : "Error Occured",
                });
            }
        });
    }
}

export default FereProService;
