require('dotenv').config();
const express = require('express');
const CronController = require('./controllers/cronController');
const WebhookController = require('./controllers/webhookController');

const app = express();

// Middleware to parse incoming JSON from Telegram
app.use(express.json());

// Initialize scheduled market report and tasks reminders 
CronController.init();

// 2. Route incoming Telegram messages to the dedicated Webhook Controller
app.post('/webhook', WebhookController.handleIncomingMessage);

// Start the Express server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});