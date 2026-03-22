const cron = require('node-cron');
const axios = require('axios');
const MarketService = require('../services/marketService');
const AIService = require('../services/aiService'); 
const FinanceService = require('../services/financeService'); 
const TaskService = require('../services/taskService'); 

class CronController {
    
    static init() {
        console.log("Initializing Cron Jobs...");

        // --- 1. DAILY GLOBAL MARKET REPORT (9:00 AM) ---
        cron.schedule('0 9 * * *', async () => {
            console.log("⏰ CRON TRIGGERED: Generating Daily Global Market Report...");
            try {
                const rawMarketData = await MarketService.gatherDailyMarketData();
                const finalReport = await AIService.generateMarketReport(rawMarketData);
                
                await axios.post(`https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/sendMessage`, {
                    chat_id: process.env.TELEGRAM_CHAT_ID,
                    text: finalReport,
                    parse_mode: 'Markdown'
                });
                console.log("✅ Daily Global Market Report sent successfully!");
            } catch (error) {
                console.error("❌ Error generating daily report:", error.message);
                await axios.post(`https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/sendMessage`, {
                    chat_id: process.env.TELEGRAM_CHAT_ID,
                    text: "⚠️ *System Alert:* The Global Market Report failed to generate this morning."
                });
            }
        }, {
            scheduled: true,
            timezone: "Asia/Jakarta"
        });

        // --- 2. AUTOMATED SALARY PAYOUT (11:55 PM) ---
        cron.schedule('55 23 * * *', async () => {
            console.log("⏰ CRON TRIGGERED: Checking Automated Salary Payout...");
            
            try {
                const settings = await FinanceService.getSalarySettings();
                
                // Disable = No automation, skipping the payout logic entirely
                if (!settings || settings['Salary_Frequency'] === 'disabled') {
                    console.log("No active salary automation found. Skipping.");
                    return; 
                }

                // Get today's date info in Jakarta time
                const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
                const todayDate = now.getDate(); // Returns 1-31
                const todayDay = now.getDay();   // Returns 0 (Sun) to 6 (Sat)
                
                const frequency = settings['Salary_Frequency'];
                const amount = settings['Salary_Amount'];
                let shouldPayout = false;

                // Logic for Daily Payout (Monday = 1 through Friday = 5)
                if (frequency === 'daily') {
                    // Checking if its a weekday 
                    if (todayDay >= 1 && todayDay <= 5) {
                        try {
                            // Get current year and format today's date to YYYY-MM-DD
                            const currentYear = now.getFullYear();
                            const formattedDate = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
                            
                            // Fetch user's country public holidays for this year from the free Nager.Date API
                            const holidayResponse = await axios.get(`https://date.nager.at/api/v3/PublicHolidays/${currentYear}/ID`);
                            const holidays = holidayResponse.data;
                            
                            // Check if today's date is in the holiday array
                            const isHoliday = holidays.some(holiday => holiday.date === formattedDate);
                            
                            if (isHoliday) {
                                const holidayName = holidays.find(h => h.date === formattedDate).localName;
                                console.log(`Today is a public holiday (${holidayName}). Skipping daily payout.`);
                            } else {
                                shouldPayout = true; 
                            }

                        } catch (apiError) {
                            console.error("⚠️ Holiday API failed. Defaulting to standard weekday payout.", apiError.message);
                            shouldPayout = true; 
                        }
                    } else {
                        console.log("Today is a weekend. No daily payout.");
                    }
                }

                // Logic for Monthly Payout
                else if (frequency === 'monthly') {
                    const payDate = parseInt(settings['Salary_Date'], 10);
                    if (todayDate === payDate) {
                        shouldPayout = true;
                    } else {
                        console.log(`Today is the ${todayDate}, payday is the ${payDate}. Skipping.`);
                    }
                }

                // Execute the automated salary payout
                if (shouldPayout) {
                    await FinanceService.logTransaction(
                        'Income', 
                        amount, 
                        'Salary (Automated)', 
                        'Automated scheduled payout'
                    );

                    // Send a notification to Telegram
                    await axios.post(`https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/sendMessage`, {
                        chat_id: process.env.TELEGRAM_CHAT_ID,
                        text: `💰 *Automated Payout Complete!*\nRp ${amount} has been successfully added to your ledger for today's automated salary.`,
                        parse_mode: 'Markdown'
                    });
                    
                    console.log(`✅ Automated salary payout of Rp ${amount} executed successfully!`);
                }

            } catch (error) {
                console.error("❌ Error executing automated salary:", error.message);
                await axios.post(`https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/sendMessage`, {
                    chat_id: process.env.TELEGRAM_CHAT_ID,
                    text: "⚠️ *System Alert:* The Automated Salary Engine encountered an error and failed to log today's payout."
                });
            }
        }, {
            scheduled: true,
            timezone: "Asia/Jakarta"
        });

    }
}

module.exports = CronController;