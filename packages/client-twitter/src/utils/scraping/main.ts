// Utility to generate a random location
export function getRandomLocation(): string {
    const locations = [
        "near:NYC within:15mi",
        "near:LosAngeles within:20mi",
        "near:Berlin within:10km",
        "near:London within:10mi",
        "near:SanFrancisco within:10mi",
        "near:Tokyo within:5km",
        "near:Sydney within:10km",
    ];

    // 80% chance to use a location, 20% to return an empty string
    return Math.random() < 0.8
        ? locations[Math.floor(Math.random() * locations.length)]
        : ""; // No location
}

// Utility to generate a random date range
export function getRandomDateRange(startDate: number): {
    sinceDate: string;
    untilDate: string;
} {
    const start = new Date(startDate, 0, 1).getTime(); // Start date: Jan 1, 2020
    const end = new Date().getTime(); // Current date
    const randomSince = new Date(start + Math.random() * (end - start));
    const randomUntil = new Date(
        randomSince.getTime() + Math.random() * (end - randomSince.getTime())
    );

    return {
        sinceDate: randomSince.toISOString().split("T")[0],
        untilDate: randomUntil.toISOString().split("T")[0],
    };
}

// Utility to pick a random language
export function getRandomLanguage(): string {
    const langs = ["lang:en", "lang:es", "lang:fr", "lang:de", "lang:it"];
    return langs[Math.floor(Math.random() * langs.length)];
}

// Utility to pick a random keyword based on a condition
export function getRandomKeyword(keywords: string[]): string {
    return keywords[Math.floor(Math.random() * keywords.length)];
}

