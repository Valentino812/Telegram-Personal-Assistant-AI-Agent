const fs = require('fs');
const readline = require('readline');
const { google } = require('googleapis');

// API scopes accessed from Google API Library
const SCOPES = [
    'https://www.googleapis.com/auth/tasks',
    'https://www.googleapis.com/auth/spreadsheets'
];

// Load client credentials from a local file (You can get this from the Google Cloud Console OAuth 2.0 Client Secret JSON Download).
fs.readFile('credentials.json', (err, content) => {
    if (err) return console.log('Error loading client secret file:', err);
    // Authorize a client with credentials, then call the Google API.
    authorize(JSON.parse(content));
});

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
    
    rl.question('\nEnter the code from that page here: ', (code) => {
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