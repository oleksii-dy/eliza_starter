import { Provider } from "@elizaos/eliza";
import { UdioGenerateResponse, UdioSamplerOptions, UdioSong } from "../types";

const API_BASE_URL = "https://www.udio.com/api";

export interface UdioProvider extends Provider {
    authToken: string;
    makeRequest(url: string, method: string, data?: any): Promise<any>;
    generateSong(prompt: string, samplerOptions: UdioSamplerOptions, customLyrics?: string): Promise<UdioGenerateResponse>;
    checkSongStatus(songIds: string[]): Promise<{songs: UdioSong[]}>;
}

export const udioProvider: UdioProvider = {
    name: "udio",
    description: "Udio AI Music Generation Provider",
    authToken: "",

    async makeRequest(url: string, method: string, data?: any) {
        const headers = {
            "Accept": method === 'GET' ? "application/json, text/plain, */*" : "application/json",
            "Content-Type": "application/json",
            "Cookie": `sb-api-auth-token=${this.authToken}`,
            "Origin": "https://www.udio.com",
            "Referer": "https://www.udio.com/my-creations",
        };

        const options: RequestInit = {
            method,
            headers,
            body: data ? JSON.stringify(data) : undefined,
        };

        const response = await fetch(url, options);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    },

    async generateSong(prompt: string, samplerOptions: UdioSamplerOptions, customLyrics?: string) {
        const url = `${API_BASE_URL}/generate-proxy`;
        const data = {
            prompt,
            samplerOptions,
            ...(customLyrics && { lyricInput: customLyrics }),
        };
        return this.makeRequest(url, 'POST', data);
    },

    async checkSongStatus(songIds: string[]) {
        const url = `${API_BASE_URL}/songs?songIds=${songIds.join(',')}`;
        return this.makeRequest(url, 'GET');
    }
};