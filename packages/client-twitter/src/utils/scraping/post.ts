import {
    getRandomDateRange,
    getRandomKeyword,
    getRandomLocation,
} from "./main";

// Function to generate a query for finding founders and CEOs
export function generateQuery(): string {
    const keywords = [
        "crypto",
        "blockchain",
        "innovation",
        "crypto",
        "startups",
        "web3",
        "rollups",
        "wallets",
        "blockchain",
        "privacy",
        "Fantom",
    ];
    const { sinceDate, untilDate } = getRandomDateRange(2020);
    const keyword = getRandomKeyword(keywords); // Pass keywords here
    const negationFilter = Math.random() < 0.5 ? "-filter:verified" : "";
    const randomLocation = getRandomLocation();

    const queryParts: string[] = [
        keyword,
        `since:${sinceDate}`,
        `until:${untilDate}`,
        negationFilter,
        randomLocation,
    ];

    return queryParts.filter(Boolean).join(" ");
}
