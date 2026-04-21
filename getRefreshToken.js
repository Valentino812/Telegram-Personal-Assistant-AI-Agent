require('dotenv').config();
const readline = require('readline');
const { google } = require('googleapis');

// API scopes accessed from Google API Library
const SCOPES = [
    'https://www.googleapis.com/auth/tasks',
    'https://www.googleapis.com/auth/spreadsheets'
];

//  Credentials
const credentials = {
    installed: {
        client_id: process.env.GOOGLE_CLIENT_ID,
        project_id: "personal-assistant-bot-491001",
        auth_uri: "https://accounts.google.com/o/oauth2/auth",
        token_uri: "https://oauth2.googleapis.com/token",
        auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uris: ["http://localhost"]
    }
};

// Check ENV Variables
if (!credentials.installed.client_id || !credentials.installed.client_secret) {
    console.error("❌ Error: Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET in your .env file!");
    process.exit(1);
}

// Directly authorize using the constructed object 
authorize(credentials);

function authorize(credentials) {
    const { client_secret, client_id, redirect_uris } = credentials.installed;
    const oAuth2Client = new google.auth.OAuth2(
        client_id, client_secret, redirect_uris[0]
    );

    getNewToken(oAuth2Client);
}

function getNewToken(oAuth2Client) {
    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline', // This is crucial! It forces Google to give us a Refresh Token
        prompt: 'consent',      // Forces the consent screen so we definitely get the token
        scope: SCOPES,
    });
    console.log('Authorize this app by visiting this url:\n', authUrl);
    
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    
    rl.question('\nEnter the code from that page here (From the URL Parameter): ', (code) => {
        rl.close();
        oAuth2Client.getToken(decodeURIComponent(code), (err, token) => {
            if (err) return console.error('Error retrieving access token', err);
            
            console.log('\n=========================================');
            console.log('SUCCESS! Here is your Refresh Token:');
            console.log('=========================================\n');
            console.log(token.refresh_token);
            console.log('\nCopy the string above and paste it into your .env file as GOOGLE_REFRESH_TOKEN');
        });
    });
}