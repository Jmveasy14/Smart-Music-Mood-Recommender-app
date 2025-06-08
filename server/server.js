// VibeCast - Backend Server
// File: server.js
// Description: Main entry point for the Node.js Express backend.

// --- Imports ---
const express = require('express');
const cors = require('cors');
const axios = require('axios'); // For making HTTP requests to Spotify
const querystring = require('querystring'); // For formatting data for Spotify API
const crypto = require('crypto'); // For generating random state string
const cookieParser = require('cookie-parser'); // To handle cookies for state validation
require('dotenv').config(); // To manage environment variables

// --- App Initialization ---
const app = express();
const PORT = process.env.PORT || 8888; // Use port from .env or default to 8888

// --- Environment Variables ---
// Make sure to create a .env file in your /server directory with these variables
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
// The redirect URI must be whitelisted in your Spotify Developer Dashboard
// IMPORTANT: Spotify no longer allows 'localhost'. Use the loopback IP '127.0.0.1'
const SPOTIFY_REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI;
const FRONTEND_URI = process.env.FRONTEND_URI || 'http://127.0.0.1:3000';

// --- Middleware ---
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser()); // Use cookie-parser middleware

// --- API Routes ---

/**
 * Generates a random string containing numbers and letters
 * @param  {number} length The length of the string
 * @return {string} The generated string
 */
const generateRandomString = (length) => {
    return crypto
        .randomBytes(Math.ceil(length / 2))
        .toString('hex')
        .slice(0, length);
};

const stateKey = 'spotify_auth_state';

/**
 * @route   GET /api/auth/login
 * @desc    Initiates the Spotify OAuth Authorization Code Flow.
 * Redirects the user to the Spotify authorization page.
 * @access  Public
 */
app.get('/api/auth/login', (req, res) => {
    const state = generateRandomString(16);
    res.cookie(stateKey, state);

    // The permissions our app needs
    const scope = 'user-read-private user-read-email playlist-read-private playlist-read-collaborative';

    const authUrl = 'https://accounts.spotify.com/authorize?' +
        querystring.stringify({
            response_type: 'code',
            client_id: SPOTIFY_CLIENT_ID,
            scope: scope,
            redirect_uri: SPOTIFY_REDIRECT_URI,
            state: state
        });
    
    // Redirect to Spotify's authorization page
    res.redirect(authUrl);
});

/**
 * @route   GET /api/auth/callback
 * @desc    The route Spotify redirects to after user authorization.
 * Exchanges the authorization code for an access token.
 * @access  Public
 */
app.get('/api/auth/callback', async (req, res) => {
    const code = req.query.code || null;
    const state = req.query.state || null;
    const storedState = req.cookies ? req.cookies[stateKey] : null;

    if (state === null || state !== storedState) {
        // State mismatch, likely a security risk (CSRF attack)
        res.redirect(`${FRONTEND_URI}/#` + querystring.stringify({ error: 'state_mismatch' }));
    } else {
        res.clearCookie(stateKey);
        const authOptions = {
            url: 'https://accounts.spotify.com/api/token',
            method: 'post',
            data: querystring.stringify({
                code: code,
                redirect_uri: SPOTIFY_REDIRECT_URI,
                grant_type: 'authorization_code'
            }),
            headers: {
                'Authorization': 'Basic ' + (Buffer.from(SPOTIFY_CLIENT_ID + ':' + SPOTIFY_CLIENT_SECRET).toString('base64')),
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            json: true
        };

        try {
            const response = await axios(authOptions);
            const { access_token, refresh_token, expires_in } = response.data;
            
            // Pass tokens to the frontend via query parameters
            res.redirect(`${FRONTEND_URI}/#` +
                querystring.stringify({
                    access_token: access_token,
                    refresh_token: refresh_token,
                    expires_in: expires_in
                }));

        } catch (error) {
            console.error("Error exchanging code for token:", error.response ? error.response.data : error.message);
            res.redirect(`${FRONTEND_URI}/#` + querystring.stringify({ error: 'invalid_token' }));
        }
    }
});

// A simple test route
app.get('/', (req, res) => {
    res.send('VibeCast Backend is alive!');
});

// --- Server Listener ---
app.listen(PORT, () => {
    console.log(`✅ Server is running on http://127.0.0.1:${PORT}`);
});
