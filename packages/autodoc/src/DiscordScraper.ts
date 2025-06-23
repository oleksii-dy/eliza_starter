export interface DiscordIssueSolution {
  issue: string;
  solution: string;
}

export class DiscordScraper {
  static async fetchKnownIssues(packageName: string): Promise<DiscordIssueSolution[]> {
    const endpoint = process.env.DISCORD_SCRAPER_ENDPOINT;
    if (!endpoint) {
      console.warn('DISCORD_SCRAPER_ENDPOINT not configured');
      return [];
    }
    const url = `${endpoint}?package=${encodeURIComponent(packageName)}`;
    try {
      const res = await fetch(url);
      if (!res.ok) {
        console.error('Failed to fetch discord issues:', res.statusText);
        return [];
      }
      const data = await res.json();
      if (!Array.isArray(data)) {
        return [];
      }
      return data as DiscordIssueSolution[];
    } catch (err) {
      console.error('Discord scraper error:', err);
      return [];
    }
  }
}
