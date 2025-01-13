export interface ChainCatcherItem {
    title: string;
    pubDate: string;
    link: string;
    guid: string;
    thumbnail: string;
    content: string;
    description: string;
    enclosure: any;
    categories: any[];
}
export interface ChainCatcherFeed {
    url: string;
    title: string;
    link: string;
    author: string;
    description: string;
    image: string;
}
export interface ChainCatcherResponse {
    status: string;
    feed: ChainCatcherFeed;
    items: ChainCatcherItem[];
}

export async function fetchChainCatcher(): Promise<ChainCatcherResponse> {
    try {
        // Check cache first if provided

        const config = {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            },
        };
        const response = await fetch(
            `https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Fwww.chaincatcher.com%2Frss%2Fclist`,
            config
        );

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(
                `HTTP error! Status: ${response.status}, Message: ${errorText}`
            );
        }

        const data = await response.json();
        if (!data.status || data.status !== "ok") {
            throw new Error("Failed to fetch latest news data");
        }

        return data;
    } catch (error) {
        console.error("Error fetching news data:", error);
        throw error;
    }
}
