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
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const SPOTIFY_REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI;
const FRONTEND_URI = process.env.FRONTEND_URI || 'http://127.0.0.1:3000';

// --- Middleware ---
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// --- Helper Functions ---
const generateRandomString = (length) => {
    return crypto.randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length);
};

const stateKey = 'spotify_auth_state';

// --- API Routes ---

/**
 * @route   GET /api/auth/login
 * @desc    Initiates the Spotify OAuth Authorization Code Flow.
 */
app.get('/api/auth/login', (req, res) => {
    const state = generateRandomString(16);
    res.cookie(stateKey, state);
    const scope = 'user-read-private user-read-email playlist-read-private playlist-read-collaborative';
    const authUrl = 'https://accounts.spotify.com/authorize?' +
        querystring.stringify({
            response_type: 'code',
            client_id: SPOTIFY_CLIENT_ID,
            scope: scope,
            redirect_uri: SPOTIFY_REDIRECT_URI,
            state: state
        });
    res.redirect(authUrl);
});

/**
 * @route   GET /api/auth/callback
 * @desc    The route Spotify redirects to after user authorization.
 */
app.get('/api/auth/callback', async (req, res) => {
    const code = req.query.code || null;
    const state = req.query.state || null;
    const storedState = req.cookies ? req.cookies[stateKey] : null;

    if (state === null || state !== storedState) {
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
        };

        try {
            const response = await axios(authOptions);
            const { access_token, refresh_token, expires_in } = response.data;
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

/**
 * @route   GET /api/playlists
 * @desc    Fetches the current user's playlists from Spotify.
 * @access  Private (requires access token)
 */
app.get('/api/playlists', async (req, res) => {
    // The access token is expected to be in the Authorization header
    const token = req.headers.authorization; // "Bearer <token>"

    if (!token) {
        return res.status(401).json({ error: 'Authorization token not provided.' });
    }

    try {
        const response = await axios.get('https://api.spotify.com/v1/me/playlists', {
            headers: {
                'Authorization': token // Pass the "Bearer <token>" string directly
            }
        });
        res.status(200).json(response.data);
    } catch (error) {
        console.error("Error fetching playlists:", error.response ? error.response.data : error.message);
        res.status(error.response.status || 500).json({ error: 'Failed to fetch playlists from Spotify.' });
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
