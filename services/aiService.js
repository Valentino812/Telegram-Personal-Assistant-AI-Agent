const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini 
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

class AIService {
    // Main Command handler
    static async handleCommand(prompt) {
        console.log("Sending prompt to Gemini...");
        
        try {
            const result = await model.generateContent(prompt);
            return result.response.text();
        } catch (error) {
            console.error("AI Command Error:", error);
            return "⚠️ Sorry, I had trouble processing that request.";
        }
    }

    // Regular Market Report Generator
    static async generateMarketReport(rawMarketData) {
        console.log("Analyzing data with Gemini...");
        
        // Prompt template for market report
        const prompt = `
        You are an elite financial analyst creating a morning "Global Market Report" for a private client. 
        I am providing you with raw scraped data containing formal news headlines and retail sentiment from Reddit, StockTwits, and Stockbit.

        Your task is to synthesize this raw data into a clear, executive-style briefing.

        Formatting Guidelines:
        - Make it highly readable for a mobile screen (Telegram). Use bullet points, bold text, and line breaks.
        - Start with a quick 1-3 sentence overarching summary.
        - Section 1: Global Macro & US Markets (Synthesize the CNBC news and Reddit/Stocktwits sentiment).
        - Section 2: Indonesian Market & IHSG (Focus on CNBC Indonesia and Stockbit sentiment).
        - Section 3: Commodities & Forex (Highlight key movements or news regarding Gold, Silver, and currencies based on the Investing.com feeds).
        - Section 4: Sentiment Divergence (Briefly point out if retail traders seem overly greedy or fearful compared to the formal news).
        
        Data Constraints:
        - DO NOT make up data, prices, or news. 
        - If a section lacks data (e.g., no Stockbit posts were scraped), just omit it smoothly. Do not apologize.

        Here is the raw scraped data to analyze:
        """
        ${rawMarketData}
        """
        `;

        try {
            const result = await model.generateContent(prompt);
            return result.response.text();
        } catch (error) {
            console.error("AI Report Generation Error:", error);
            return "⚠️ Error: The data was gathered, but the AI failed to generate the summary.";
        }
    }
}

module.exports = AIService;