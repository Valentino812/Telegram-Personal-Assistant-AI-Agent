require('dotenv').config();
const { google } = require('googleapis');

// Initialize the OAuth2 client using the credentials from .env
const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    'http://localhost' 
);

// Load the refresh token from the .env file and set it on the OAuth2 client
oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN
});

// Export the fully authenticated client
module.exports = oauth2Client;