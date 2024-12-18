import { chromium } from 'playwright';

async function getSoundCloudStats(trackUrl: string) {
    try {
        const browser = await chromium.launch();
        const page = await browser.newPage();
        await page.goto(trackUrl);

        // Wait for stats to load
        await page.waitForSelector('.sc-ministats-plays');

        // Get play count with null checking
        const playsElement = await page.$('.sc-ministats-plays');
        const playsText = playsElement ? await playsElement.textContent() : null;
        const plays = playsText ? parseInt(playsText.match(/\d+/)?.[0] || '0') : 0;

        // Get likes count
        const likesText = await page.evaluate(() => {
            const likesEl = document.querySelector('.sc-ministats-likes span[aria-hidden="true"]');
            return likesEl ? likesEl.textContent : '0';
        });
        const likes = parseInt(likesText || '0');

        // Get reposts count
        const repostsText = await page.evaluate(() => {
            const repostsEl = document.querySelector('.sc-ministats-reposts span[aria-hidden="true"]');
            return repostsEl ? repostsEl.textContent : '0';
        });
        const reposts = parseInt(repostsText || '0');

        // Get days since release
        const daysReleasedText = await page.evaluate(() => {
            const timeEl = document.querySelector('time.relativeTime span[aria-hidden="true"]');
            return timeEl ? timeEl.textContent : null;
        });

        // Parse days from text (e.g., "2 days ago")
        const daysReleased = daysReleasedText
            ? parseInt(daysReleasedText.match(/\d+/)?.[0] || '0')
            : null;

        // Calculate per-day metrics
        const playsPerDay = daysReleased ? plays / daysReleased : null;
        const likesPerDay = daysReleased ? likes / daysReleased : null;
        const repostsPerDay = daysReleased ? reposts / daysReleased : null;

        await browser.close();

        return {
            plays,
            likes,
            reposts,
            daysReleased,
            playsPerDay,
            likesPerDay,
            repostsPerDay,
            url: trackUrl
        };

    } catch (error) {
        console.error('Error fetching SoundCloud stats:', error);
        return null;
    }
}

const tracks = [
    "https://soundcloud.com/dolla-llama/hallucinations",
    "https://soundcloud.com/dolla-llama/cabal",
];

async function getAllTrackStats() {
    const stats = await Promise.all(
        tracks.map(track => getSoundCloudStats(track))
    );
    console.log("All track stats:", stats);
    return stats;
}

// Run and handle any errors
async function test() {
    try {
        await getAllTrackStats();
    } catch (error) {
        console.error("Error getting stats:", error);
    }
}

test();