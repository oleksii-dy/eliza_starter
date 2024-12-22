import { elizaLogger } from "@ai16z/eliza";

export async function askServer(data: any) {
    try {
        const response = await fetch(`${process.env.SERVER_URL}/api/start-check`, {
            method: "POST",
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                sessionId: data.sessionId,
                inviteUrl: data.inviteUrl,
                telegramId: data.telegramId,
            }),
        });
        return response.json();
    } catch (error) {
        elizaLogger.error("Error asking server:", error);
        throw error;
    }
}
