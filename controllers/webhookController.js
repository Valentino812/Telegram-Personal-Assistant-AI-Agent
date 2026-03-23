const axios = require('axios');
const AIService = require('../services/aiService');
const MarketService = require('../services/marketService');
const TaskService = require('../services/taskService'); 
const FinanceService = require('../services/financeService'); 

// We define the tutorial once at the top so it can be reused easily!
const TUTORIAL_MESSAGE = `*Command Center*

* Tasks:*
• \`/addtask [Name], [Deadline (YYYY-MM-DD Format)]\` - Add a new task.
• \`/donetask [Keyword]\` - Mark a task complete.
• \`/viewtasks\` - See your 10 most urgent tasks.

* Finance (Manual):*
• \`/spend [Amount], [Description]\` - Log an expense.
• \`/earn [Amount], [Description]\` - Log an income.
• \`/viewfinance\` - See last 10 transactions.

* Finance (Automated Salary):*
• \`/setsalary [daily/monthly], [Amount], [Date (Only for monthly) (YYYY-MM-DD Format)]\` - Setup auto-income.
• \`/checksalary\` - View salary automation settings.
• \`/deletesalary\` - Turn off automated salary.

* Other Utilities:*
• \`/market\` - Generate an instant Global Market Report.
• \`/read [Prompt]\` - Ask to analyze your tasks and finance data 
• \`/help\` - Showing this menu.`;

class WebhookController {
    static async handleIncomingMessage(req, res) {
        const message = req.body.message;
        if (!message || !message.text) return; 

        const chatId = message.chat.id;
        const userText = message.text;
        
        // Helper function to send messages back to Telegram
        const reply = async (text) => {
            await axios.post(`https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/sendMessage`, {
                chat_id: chatId,
                text: text,
                parse_mode: 'Markdown'
            });
        };

        // Separate command from payload
        const splitIndex = userText.indexOf(' ');
        const command = splitIndex === -1 ? userText.toLowerCase() : userText.substring(0, splitIndex).toLowerCase();
        const payload = splitIndex === -1 ? '' : userText.substring(splitIndex + 1).trim();

        console.log(`Received command: ${command} | Payload: ${payload}`);

        try {
            // The Command Router
            switch (command) {
                
                // --- UTILITY ---
                case '/help':
                    await reply(TUTORIAL_MESSAGE);
                    break;
                
                case '/market':
                    await reply("Gathering your market report... (This usually takes 10-15 seconds)");
                    try {
                        // Fetch the raw data just like the Cron job does
                        const rawMarketData = await MarketService.gatherDailyMarketData();
                        // Pass it to Gemini
                        const finalReport = await AIService.generateMarketReport(rawMarketData);
                        // Send the result to Telegram
                        await reply(finalReport);
                    } catch (error) {
                        console.error("Manual Market Report Error:", error);
                        await reply("⚠️ Failed to generate the market report. Please try again later.");
                    }
                    break;

                    case '/read':
                    if (!payload) return await reply("⚠️ Please provide a prompt. Example: `/read What did I spend on food recently?`");
                    await reply("Thinking... let me check your records.");
                    
                    try {
                        // Fetch Finance Data from Google Sheets
                        let financeData = "No financial records found.";
                        try {
                            // Grabs the last 20 transactions from your Google Sheet
                            financeData = await FinanceService.getRecentTransactions(20);
                        } catch (err) {
                            // If the sheet doesn't exist yet, we just ignore the error and leave it blank
                            if (err.message !== "SHEET_NOT_FOUND") console.error("Read Command Finance Error:", err);
                        }

                        // Fetch Task Data from Google Tasks 
                        let taskData = "[Google Tasks integration coming soon...]";
                            
                        try {
                            // Grabs the last 20 transactions from your Google Sheet
                            taskData = await TaskService.getRecentTasks(20);
                        } catch (err) {
                            // If the sheet doesn't exist yet, we just ignore the error and leave it blank
                            if (err.message !== "TASKS_NOT_FOUND") console.error("Read Command Task Error:", err);
                        }

                        // Template Prompt
                        const fullPrompt = `
                            You are a personal assistant. 
                            I am going to ask you a question. Answer it concisely and conversationally based ONLY on the data provided below. 
                            If the answer is not in the data, state clearly that you don't have enough information. Do not guess.

                            User's Question: "${payload}"

                            --- MY RECENT TRANSACTIONS ---
                            ${financeData}

                            --- MY UPCOMING TASKS ---
                            ${taskData}
                        `;

                        // Send the data packet to Gemini API
                        const aiResponse = await AIService.handleCommand(fullPrompt);
                        await reply(aiResponse);

                    } catch (error) {
                        console.error("Read Command Error:", error);
                        await reply("⚠️ Sorry, I ran into a system error while analyzing your data.");
                    }
                    break;

                // --- TASKS ---
                case '/addtask':
                    if (!payload.includes(',')) return await reply("⚠️ Format error. Use: `/addtask Name, Deadline`");
                    const [taskName, deadline] = payload.split(',').map(s => s.trim());
                    
                    await reply("Adding task...");
                    try {
                        await TaskService.addTask(taskName, deadline);
                        await reply(`✅ Task added: *${taskName}* (Due: ${deadline})`);
                    } catch (error) {
                        console.error("Add Task Error:", error);
                        await reply("⚠️ Failed to add the task to Google Tasks.");
                    }
                    break;

                case '/donetask':
                    if (!payload) return await reply("⚠️ Please provide a task keyword to complete.");
                    
                    await reply("Searching for task...");
                    try {
                        const completedName = await TaskService.completeTask(payload);
                        await reply(`✅ Task completed: *${completedName}*`);
                    } catch (error) {
                        if (error.message === "TASK_NOT_FOUND") {
                            return await reply(`⚠️ Could not find any pending tasks matching "*${payload}*".`);
                        }
                        console.error("Complete Task Error:", error);
                        await reply("⚠️ Failed to complete the task.");
                    }
                    break;
                    
                case '/viewtasks':
                    await reply("Fetching your upcoming tasks...");
                    try {
                        const recentTasks = await TaskService.getRecentTasks(10);
                        await reply(`${recentTasks}\n🔗 [Open Google Tasks](https://mail.google.com/tasks/canvas)`);
                    } catch (error) {
                        console.error("View Tasks Error:", error);
                        await reply("⚠️ Failed to fetch tasks from Google Tasks.");
                    }
                    break;

                // --- FINANCE (MANUAL) ---
                case '/spend':
                case '/earn':
                    const finParams = payload.split(',').map(s => s.trim());
                    if (finParams.length !== 2) return await reply(`⚠️ Format error. Use: \`${command} Amount, Description\``);
                    
                    const type = command === '/spend' ? 'Expense' : 'Income';
                    const amount = command === '/spend' ? `-${finParams[0]}` : finParams[0];
                    const description = finParams[1];
                    
                    // Automatically assign "Manual" as the category
                    const categoryString = `Manual`;

                    await reply("Writing to Google Sheets...");
                    await FinanceService.logTransaction(type, amount, categoryString, description);
                    await reply(`✅ Logged ${type.toLowerCase()}: *Rp ${finParams[0]}* for ${description}`);
                    break;
                    
                case '/viewfinance':
                    try {
                        await reply("Fetching your recent transactions...");
                        const recentData = await FinanceService.getRecentTransactions();
                        const sheetLink = `https://docs.google.com/spreadsheets/d/${process.env.GOOGLE_SHEET_ID}`;
                        await reply(`${recentData}\n🔗 [Open Full Google Sheet](${sheetLink})`);
                    } catch (error) {
                        if (error.message === "SHEET_NOT_FOUND") return await reply(MISSING_TABLE_MSG);
                        throw error;
                    }
                    break;

                // --- AUTOMATED SALARY ---

                case '/setsalary':
                    const salParams = payload.split(',').map(s => s.trim());
                    if (salParams.length < 2) return await reply("⚠️ Format error. Use: `/setsalary daily/monthly, Amount, [Date]`");
                    
                    // We define our clean variables here
                    const frequency = salParams[0].toLowerCase();
                    const salaryAmount = salParams[1]; // Renamed for better clarity
                    const dateParam = salParams[2] || '-';

                    // Logic to prevent end-of-month bugs
                    if (frequency === 'monthly') {
                        const dateNum = parseInt(dateParam, 10);
                        if (isNaN(dateNum) || dateNum < 1 || dateNum > 27) {
                            return await reply("⚠️ *Invalid Date!*\nTo avoid calendar bugs with shorter months (like February), please choose a payout date between **1 and 27**.");
                        }
                    }

                    await reply("Saving configuration to Google Sheets...");
                   
                    // Passing the renamed variable into the Service
                    await FinanceService.saveSalarySettings(frequency, salaryAmount, dateParam); 
                    
                    await reply(`⚙️ Salary automation set to *${frequency}* for *Rp ${salaryAmount}*.`);
                    break;

                case '/checksalary':
                    const settings = await FinanceService.getSalarySettings();
                    
                    if (!settings || settings['Salary_Frequency'] === 'disabled') {
                        await reply("⚠️ You don't have an active automated salary setup. Use `/setsalary` to create one.");
                    } else {
                        await reply(`📊 *Current Salary Settings:*\nType: ${settings['Salary_Frequency']}\nAmount: Rp ${settings['Salary_Amount']}\nDate: ${settings['Salary_Date']}`);
                    }
                    break;

                case '/deletesalary':
                    await FinanceService.deleteSalarySettings();
                    await reply("Automated salary tracking is disabled.");
                    break;
             
                default:
                    await reply(`❓ *Sorry, I didn't understand that command.*\n\nPlease use one of the structured commands below:\n\n${TUTORIAL_MESSAGE}`);
            }

        } catch (error) {
            console.error("Error processing webhook:", error);
            await reply("⚠️ Sorry, I encountered a system error processing that command.");
        } finally {
            // Returning complete status
            return res.status(200).send('OK');
        }
    }
}

module.exports = WebhookController;