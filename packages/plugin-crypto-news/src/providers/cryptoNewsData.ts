import { elizaLogger, Provider } from "@elizaos/core";
import { ChainCatcherResponse, fetchChainCatcher } from "../utils/chainCatcher";

// interface FormattedMarketData {
//     symbol: string;
//     name: string;
//     price: string;
//     priceChange24h: string;
//     priceChange1h: string;
//     volume24h: string;
//     volume1h: string;
//     marketCap: string;
//     realMarketCap: string;
//     liquidity: string;
//     holders: string;
//     uniqueWallets24h: string;
//     uniqueWallets1h: string;
//     socialLinks: string[];
// }

// function formatNumber(num: number): string {
//     if (num >= 1e9) {
//         return `$${(num / 1e9).toFixed(2)}B`;
//     } else if (num >= 1e6) {
//         return `$${(num / 1e6).toFixed(2)}M`;
//     } else if (num >= 1e3) {
//         return `$${(num / 1e3).toFixed(2)}K`;
//     }
//     return `$${num.toFixed(2)}`;
// }

// function formatPercentage(num: number): string {
//     const sign = num > 0 ? "+" : "";
//     return `${sign}${num.toFixed(2)}%`;
// }

// function getSocialLinks(extensions: any): string[] {
//     const links = [];
//     if (extensions.website) links.push(`🌐 ${extensions.website}`);
//     if (extensions.twitter) links.push(`🐦 ${extensions.twitter}`);
//     if (extensions.telegram) links.push(`📱 ${extensions.telegram}`);
//     if (extensions.discord) links.push(`💬 ${extensions.discord}`);
//     return links;
// }

export const cryptoNewsData: Provider = {
    get: async (runtime, message, state) => {
        if (!message.content.action || message.content.action !== "TWEET") {
            return "";
        }

        try {
            // fetch several times
            const chainCatcher: ChainCatcherResponse =
                await fetchChainCatcher();

            // const cryptoNews: SerperNewsResponse =
            //     await fetchSerperNews("crypto");
            // const suiNews: SerperNewsResponse = await fetchSerperNews("$SUI");
            let output = "# NEWS\n\n";

            chainCatcher.items.forEach((article) => {
                output += `- ${article.title}\n${article.content}\n\n`;
            });

            // cryptoNews.news.forEach((article) => {
            //     output += `- ${article.title}\n${article.snippet}\n\n`;
            // });
            // suiNews.news.forEach((article) => {
            //     output += `- ${article.title}\n${article.snippet}\n\n`;
            // });
            output += `# News above are in Chinese Language, you have to translate it to ENGLISH \n\n# END NEWS\n\n`;

            elizaLogger.log(output);

            return output;
        } catch (error) {
            console.error("Error in fetching news provider:", error);
            return "";
        }
    },
};
