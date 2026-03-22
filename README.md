# 🤖 AI-Powered Personal Assistant Bot

[![Made with JavaScript](https://forthebadge.com/images/badges/made-with-javascript.svg)](https://forthebadge.com)
[![Built for Telegram](https://forthebadge.com/images/badges/uses-telegram.svg)](https://forthebadge.com)
[![Works on My Machine](https://forthebadge.com/images/badges/works-on-my-machine.svg)](https://forthebadge.com)

A stateless, cloud-ready Telegram bot engineered to bridge generative AI with daily workflow automation. This application acts as a centralized backend hub for financial tracking, task management, and data synthesis, completely eliminating the need to context-switch between productivity apps.

## ✨ Key Features

* **🧠 Dynamic Context AI:** Powered by Google Gemini 2.5 Flash. Instead of a standard chatbot, it uses a custom `/read` engine to fetch real-time financial and task data, inject it into a system prompt, and generate data-driven answers about your schedule and spending.
* **📊 Automated Financial Ledger:** Seamlessly logs manual transactions to a Google Sheet. Features a background engine to automatically inject scheduled salaries while dynamically checking the Nager.Date API to pause daily payouts on Indonesian public holidays.
* **✅ Proactive Task Management:** Syncs directly with Google Tasks to add and complete items. A background cron job parses deadlines and pushes proactive morning briefings for tasks due in 7 days, 1 day, or today.
* **📈 Global Market Intelligence:** Automatically scrapes financial news and retail sentiment, utilizing the LLM to synthesize and broadcast a daily executive-style market report every morning.

---

## 🏗️ Full-Stack Architecture

This project is built on a modular Node.js architecture with a strict Separation of Concerns, ensuring it remains scalable and ready for ephemeral cloud deployment.

* **Routing & Controllers (`Express.js`):** Utilizes webhook-based routing (`/webhook`) to instantly receive and acknowledge Telegram payloads. The `WebhookController` parses commands and routes them to dedicated services.
* **AI Engine (`@google/generative-ai`):** The `AIService` handles natural language processing and context-window optimization, acting as the analytical brain of the bot.
* **Database / Storage Layer (`googleapis`):**
    * **Google Sheets API:** Acts as the primary database for financial records. Authenticated via a **Google Cloud Service Account** (`credentials.json`), allowing the bot to securely edit the ledger as an independent machine user.
* **Personal Productivity Layer (`googleapis`):**
    * **Google Tasks API:** Authenticated via **OAuth 2.0** with persistent Refresh Tokens stored in environment variables. This ensures the bot can read and write to personal, identity-locked Google Tasks without requiring manual re-authentication.
* **Automation Engine (`node-cron`):** The `CronController` manages background jobs completely independent of user input, firing timed events for market reports, salary injections, and task reminders.

---

## 🚀 Getting Started

### Prerequisites
* Node.js (v18+)
* A Telegram Bot Token (from BotFather)
* A Google Cloud Project with the **Sheets API** and **Tasks API** enabled.

### Installation

1.  **Clone the repository:**
    ```bash
    git clone [https://github.com/yourusername/personal-assistant-bot.git](https://github.com/yourusername/personal-assistant-bot.git)
    cd personal-assistant-bot
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Configure Environment Variables:**
    Create a `.env` file in the root directory and populate it with your credentials:
    ```env
    PORT=3000
    TELEGRAM_TOKEN=your_telegram_bot_token
    TELEGRAM_CHAT_ID=your_personal_chat_id
    GEMINI_API_KEY=your_gemini_api_key
    
    # Google Tasks OAuth 2.0
    GOOGLE_CLIENT_ID=your_oauth_client_id
    GOOGLE_CLIENT_SECRET=your_oauth_client_secret
    GOOGLE_REFRESH_TOKEN=your_oauth_refresh_token
    
    # Google Sheets 
    GOOGLE_SHEET_ID=your_spreadsheet_id
    ```

4.  **Add Service Account Credentials:**
    Place your Google Cloud Service Account JSON file inside the `config/` directory and name it `service-account.json`.

5.  **Start the Server:**
    ```bash
    npm start
    ```

---

## 🕹️ Command Center Reference

Once deployed and connected to your Telegram webhook, the bot responds to the following structured commands:

### Tasks
* `/addtask [Name], [Deadline]` - Add a new task (Use YYYY-MM-DD for accurate reminders).
* `/donetask [Keyword]` - Search and mark a task as complete.
* `/viewtasks` - Fetch your top 10 most urgent tasks.

### Finance (Manual)
* `/spend [Amount], [Description]` - Log an expense.
* `/earn [Amount], [Description]` - Log an income.
* `/viewfinance` - See the last 10 transactions directly in chat.

### Finance (Automated Salary)
* `/setsalary [daily/monthly], [Amount], [Date (Only for monthly)]` - Set up automated income tracking.
* `/checksalary` - View current salary automation settings.
* `/deletesalary` - Disable automated tracking.

### Utilities
* `/read [Prompt]` - Let the AI analyze your recent tasks and financial data to answer questions.
* `/market` - Manually trigger an instant Global Market Report.
* `/help` - Show the command menu.

---

## 👨‍💻 Author

**Mika Valentino**
* LinkedIn: [\[Your LinkedIn URL\]](https://www.linkedin.com/in/mika-valentino/)
* GitHub: [\[Your GitHub URL\]](https://github.com/Valentino812)

