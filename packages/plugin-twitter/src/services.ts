import {
    TwitterFeedDataResponse
} from "./types";

const BASE_URL = "";

export const createTwitterService = (config: string) => {
    
    const getTwitterFeed = async (): Promise<TwitterFeedDataResponse> => {
        try {
            const data = await getTwitterFeed(config)
            return data
        } catch (error: any) {
            console.error("Twitter Error:", error.message);
            throw error;
        }
    }

    return { getTwitterFeed };
};