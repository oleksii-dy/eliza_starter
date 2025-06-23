import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DiscordScraper } from '../DiscordScraper.js';

const originalFetch = global.fetch;

describe('DiscordScraper', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('fetches known issues from endpoint', async () => {
    process.env.DISCORD_SCRAPER_ENDPOINT = 'http://example.com/issues';
    const mockResponse = [{ issue: 'bug', solution: 'fix' }];
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const data = await DiscordScraper.fetchKnownIssues('test');
    expect(global.fetch).toHaveBeenCalledWith(
      'http://example.com/issues?package=test'
    );
    expect(data).toEqual(mockResponse);
  });
});
