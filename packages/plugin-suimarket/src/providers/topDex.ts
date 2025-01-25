import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import * as cheerio from 'cheerio';

puppeteer.use(StealthPlugin());

export const fetchTopDexByNetwork = async (network: string) => {

    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36");
    await page.goto(`https://app.geckoterminal.com/api/p1/dexes?network=${network}&include=network%2Cdex_metric`, { waitUntil: 'networkidle2' });
    const content: string = await page.content();
    const $ = cheerio.load(content);
    const jsonText: string = $("pre").text().trim();
    try {
        const jsonData: any = JSON.parse(jsonText);
        return jsonData;
    } catch (error) {
        console.error("❌ JSON:", error);
    }
    await browser.close();

}