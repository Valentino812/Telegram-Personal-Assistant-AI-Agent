const { google } = require('googleapis');

const auth = new google.auth.GoogleAuth({
    keyFile: './config/service-account.json', 
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });
const TRANSACTIONS_SHEET = 'Transactions';
const SETTINGS_SHEET = 'Settings';

class FinanceService {
    
    // Check existence of sheets
    static async checkSheetExists(sheetTitle) {
        try {
            const spreadsheetId = process.env.GOOGLE_SHEET_ID;
            const response = await sheets.spreadsheets.get({ spreadsheetId });
            return response.data.sheets.some(s => s.properties.title === sheetTitle);
        } catch (error) {
            console.error("Error checking sheet:", error.message);
            throw new Error("GOOGLE_API_ERROR");
        }
    }

    // --- TRANSACTIONS LOGIC ---

    static async ensureSheetExists() {
        const exists = await this.checkSheetExists(TRANSACTIONS_SHEET);
        if (exists) return;

        console.log("Transactions sheet not found. Creating table structure...");
        const spreadsheetId = process.env.GOOGLE_SHEET_ID;

        await sheets.spreadsheets.batchUpdate({
            spreadsheetId,
            resource: { requests: [{ addSheet: { properties: { title: TRANSACTIONS_SHEET } } }] }
        });

        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `${TRANSACTIONS_SHEET}!A1:E1`,
            valueInputOption: 'USER_ENTERED',
            resource: { values: [['Date', 'Type', 'Amount', 'Category', 'Description']] }
        });
    }

    static async logTransaction(type, amount, category, description) {
        await this.ensureSheetExists();
        const spreadsheetId = process.env.GOOGLE_SHEET_ID;
        const dateStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' }); 

        await sheets.spreadsheets.values.append({
            spreadsheetId,
            range: `${TRANSACTIONS_SHEET}!A:E`,
            valueInputOption: 'USER_ENTERED',
            insertDataOption: 'INSERT_ROWS',
            resource: { values: [[dateStr, type, amount, category, description]] }
        });
    }

    static async getRecentTransactions(limit = 10) {
        const exists = await this.checkSheetExists(TRANSACTIONS_SHEET);
        if (!exists) throw new Error("SHEET_NOT_FOUND");

        const spreadsheetId = process.env.GOOGLE_SHEET_ID;
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: `${TRANSACTIONS_SHEET}!A:E`,
        });

        const rows = response.data.values;
        if (!rows || rows.length <= 1) return "No transactions found yet.";

        const recentRows = rows.slice(1).slice(-limit);
        let output = `📋 *Last ${limit} Transactions:*\n\n`;
        recentRows.forEach(row => {
            const [date, type, amount, category, desc] = row;
            const emoji = type === 'Income' ? '📈' : '📉';
            output += `${emoji} *${date}* | Rp ${amount}\n└ ${category} - ${desc}\n\n`;
        });
        return output;
    }

    // --- AUTOMATED SALARY ---

    static async saveSalarySettings(frequency, amount, date = '-') {
        const exists = await this.checkSheetExists(SETTINGS_SHEET);
        const spreadsheetId = process.env.GOOGLE_SHEET_ID;

        // Auto-create the Settings tab if it doesn't exist
        if (!exists) {
            console.log("Settings sheet not found. Creating it...");
            await sheets.spreadsheets.batchUpdate({
                spreadsheetId,
                resource: { requests: [{ addSheet: { properties: { title: SETTINGS_SHEET } } }] }
            });
        }

        // Overwrite cells A1 through B4 to lock in the new settings
        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `${SETTINGS_SHEET}!A1:B4`,
            valueInputOption: 'USER_ENTERED',
            resource: {
                values: [
                    ['Setting', 'Value'],
                    ['Salary_Frequency', frequency.toLowerCase()],
                    ['Salary_Amount', amount],
                    ['Salary_Date', date]
                ]
            }
        });
    }

    static async getSalarySettings() {
        const exists = await this.checkSheetExists(SETTINGS_SHEET);
        if (!exists) return null;

        const spreadsheetId = process.env.GOOGLE_SHEET_ID;
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: `${SETTINGS_SHEET}!A2:B4`,
        });

        const rows = response.data.values;
        if (!rows || rows.length === 0) return null;

        // Convert the Sheet rows into a JavaScript object
        const settings = {};
        rows.forEach(row => {
            settings[row[0]] = row[1];
        });
        return settings;
    }

    static async deleteSalarySettings() {
        const exists = await this.checkSheetExists(SETTINGS_SHEET);
        if (!exists) return; 

        const spreadsheetId = process.env.GOOGLE_SHEET_ID;
        
        // Disable the engine by changing the frequency to 'disabled'
        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `${SETTINGS_SHEET}!A2:B4`,
            valueInputOption: 'USER_ENTERED',
            resource: {
                values: [
                    ['Salary_Frequency', 'disabled'],
                    ['Salary_Amount', '-'],
                    ['Salary_Date', '-']
                ]
            }
        });
    }
}

module.exports = FinanceService;