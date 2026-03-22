const Parser = require('rss-parser');
const axios = require('axios');
const puppeteer = require('puppeteer');

// User-agent header to mimic a real browser
const parser = new Parser({
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36' }
});

// Defining the Formal Sources (RSS Feeds)
const RSS_FEEDS = [
    { name: 'CNBC World (Via Google)', url: 'https://news.google.com/rss/search?q=site:cnbc.com/world' },
    { name: 'CNBC Indonesia', url: 'https://www.cnbcindonesia.com/news/rss' },
    { name: 'Investing.com (Commodities)', url: 'https://www.investing.com/rss/news_11.rss' },
    { name: 'Investing.com (Forex)', url: 'https://www.investing.com/rss/news_1.rss' }
];

// Defining Non-Formal Sources (JSON Endpoints)
const SUBREDDITS = ['wallstreetbets', 'investing'];
const STOCKTWITS_TICKERS = ['SPY', 'GLD', 'EURUSD', 'DXY'];

class MarketService {
    
    // Fetch top 5 headlines from all RSS feeds
    static async fetchFormalNews() {
        let newsSummary = "--- FORMAL MARKET NEWS ---\n";
        
        const fetchPromises = RSS_FEEDS.map(async (feed) => {
            try {
                const result = await parser.parseURL(feed.url);
                newsSummary += `\n[${feed.name}]:\n`;
                // Grab the top 5 items 
                result.items.slice(0, 5).forEach(item => {
                    newsSummary += `- ${item.title}\n`;
                });
            } catch (error) {
                console.error(`Failed to fetch RSS for ${feed.name}:`, error.message);
            }
        });

        await Promise.allSettled(fetchPromises);
        return newsSummary;
    }

    // Fetch top trending posts from Reddit
    static async fetchRedditSentiment() {
        let redditSummary = "\n--- RETAIL SENTIMENT (REDDIT) ---\n";
        
        const fetchPromises = SUBREDDITS.map(async (sub) => {
            try {
                // Kept your limit=3 in the URL, added the disguise header
                const response = await axios.get(`https://www.reddit.com/r/${sub}/hot.json?limit=3`, {
                    headers: { 'User-Agent': 'MarketBot/1.0.0' }
                });
                redditSummary += `\n[r/${sub}]:\n`;
                
                response.data.data.children.forEach(post => {
                    redditSummary += `- ${post.data.title}\n`;
                });
            } catch (error) {
                console.error(`Failed to fetch Reddit r/${sub}:`, error.message);
            }
        });

        await Promise.allSettled(fetchPromises);
        return redditSummary;
    }

    // Fetch message streams from StockTwits
    static async fetchStockTwitsSentiment() {
        let twitsSummary = "\n--- RETAIL SENTIMENT (STOCKTWITS) ---\n";
        
        const fetchPromises = STOCKTWITS_TICKERS.map(async (ticker) => {
            try {
                const response = await axios.get(`https://api.stocktwits.com/api/2/streams/symbol/${ticker}.json`);
                twitsSummary += `\n[$${ticker} Stream]:\n`;
                
                // Grab top 5 messages
                response.data.messages.slice(0, 5).forEach(msg => {
                    const sentiment = msg.entities.sentiment ? `[${msg.entities.sentiment.basic}]` : '[Neutral]';
                    twitsSummary += `- ${sentiment} ${msg.body.replace(/\n/g, ' ')}\n`;
                });
            } catch (error) {
                console.error(`Failed to fetch StockTwits for ${ticker}:`, error.message);
            }
        });

        await Promise.allSettled(fetchPromises);
        return twitsSummary;
    }

    // Fetch trending sentiment from Stockbit (Puppeteer Scraper)
    static async fetchStockbitSentiment() {
        console.log("Launching headless browser for Stockbit...");
        let stockbitSummary = "\n--- RETAIL SENTIMENT (STOCKBIT IHSG) ---\n";
        let browser;

        try {
            // Cross platform compability
            browser = await puppeteer.launch({ 
                headless: "new",
                args: ['--no-sandbox', '--disable-setuid-sandbox'] 
            });
            
            const page = await browser.newPage();
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36');
            
            // Navigate to the IHSG stream
            await page.goto('https://stockbit.com/symbol/IHSG', { waitUntil: 'networkidle2', timeout: 15000 });

            // Extract the stream text
            const streamPosts = await page.evaluate(() => {
                const postElements = Array.from(document.querySelectorAll('p, .stream-text, .post-body'));
                return postElements
                    .map(el => el.innerText.trim())
                    .filter(text => text.length > 20)
                    .slice(0, 5); // Grab top 5
            });

            if (streamPosts.length === 0) {
                stockbitSummary += "- No recent posts found or DOM structure changed.\n";
            } else {
                streamPosts.forEach(post => {
                    const truncated = post.length > 150 ? post.substring(0, 150) + '...' : post;
                    stockbitSummary += `- ${truncated.replace(/\n/g, ' ')}\n`;
                });
            }

        } catch (error) {
            console.error("Puppeteer failed to scrape Stockbit:", error.message);
            stockbitSummary += "- Scraper failed to load page.\n";
        } finally {
            if (browser) await browser.close();
        }

        return stockbitSummary;
    }

    // The Main Function that gathers everything
    static async gatherDailyMarketData() {
        console.log("Gathering Global Market Intelligence...");
        
        // Run all fetchers concurrently for maximum speed
        const [news, reddit, twits, stockbit] = await Promise.all([
            this.fetchFormalNews(),
            this.fetchRedditSentiment(),
            this.fetchStockTwitsSentiment(),
            this.fetchStockbitSentiment() 
        ]);

        const rawMarketData = `${news}\n${reddit}\n${twits}\n${stockbit}`;
        return rawMarketData;
    }
}

module.exports = MarketService;