// VibeCast - Backend Server
// File: server.js
// Description: Main entry point for the Node.js Express backend.

// --- Imports ---
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const crypto = require('crypto');
const cookieParser = require('cookie-parser');
require('dotenv').config();

// --- App Initialization ---
const app = express();
const PORT = process.env.PORT || 8888;

// --- Environment Variables ---
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const SPOTIFY_REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI;
const FRONTEND_URI = process.env.FRONTEND_URI || 'http://127.0.0.1:3000';
// Add your OpenAI API Key to your .env file
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;


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

// --- API Routes (Authentication and Playlist List - Unchanged) ---

app.get('/api/auth/login', (req, res) => {
    const state = generateRandomString(16);
    res.cookie(stateKey, state);
    const scope = 'user-read-private user-read-email playlist-read-private playlist-read-collaborative';
    
    const params = new URLSearchParams({
        response_type: 'code',
        client_id: SPOTIFY_CLIENT_ID,
        scope: scope,
        redirect_uri: SPOTIFY_REDIRECT_URI,
        state: state,
        show_dialog: true
    });
    
    res.redirect(`https://accounts.spotify.com/authorize?${params.toString()}`);
});

app.get('/api/auth/callback', async (req, res) => {
    const code = req.query.code || null;
    const state = req.query.state || null;
    const storedState = req.cookies ? req.cookies[stateKey] : null;

    if (state === null || state !== storedState) {
        return res.redirect(`${FRONTEND_URI}/#?error=state_mismatch`);
    }
    res.clearCookie(stateKey);

    try {
        const tokenParams = new URLSearchParams();
        tokenParams.append('grant_type', 'authorization_code');
        tokenParams.append('code', code);
        tokenParams.append('redirect_uri', SPOTIFY_REDIRECT_URI);

        const response = await axios({
            method: 'post',
            url: 'https://accounts.spotify.com/api/token',
            data: tokenParams,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': 'Basic ' + (Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64')),
            }
        });
        
        const { access_token, refresh_token, expires_in } = response.data;
        const redirectParams = new URLSearchParams({ access_token, refresh_token, expires_in });
        res.redirect(`${FRONTEND_URI}/#${redirectParams.toString()}`);

    } catch (error) {
        console.error("Error in /api/auth/callback:", error.response ? error.response.data : error.message);
        const redirectParams = new URLSearchParams({ error: 'invalid_token' });
        res.redirect(`${FRONTEND_URI}/#${redirectParams.toString()}`);
    }
});

app.get('/api/playlists', async (req, res) => {
    const token = req.headers.authorization;
    if (!token) return res.status(401).json({ error: 'Authorization token not provided.' });

    try {
        const response = await axios.get('https://api.spotify.com/v1/me/playlists', { headers: { 'Authorization': token } });
        res.status(200).json(response.data);
    } catch (error) {
        res.status(error.response?.status || 500).json({ error: 'Failed to fetch playlists.' });
    }
});


/**
 * @route   GET /api/playlist/:id
 * @desc    (PIVOTED) Fetches tracks and prepares for lyrical analysis.
 * @access  Private (requires access token)
 */
app.get('/api/playlist/:id', async (req, res) => {
    const token = req.headers.authorization;
    const playlistId = req.params.id;

    if (!token) return res.status(401).json({ error: 'Authorization token not provided.' });

    try {
        // Step 1: Fetch tracks with their names and artists
        let allTracks = [];
        // Updated fields to get the data we need for lyrical analysis
        const fields = 'items(track(id,name,artists(name))),next';
        let nextUrl = `https://api.spotify.com/v1/playlists/${playlistId}/tracks?fields=${encodeURIComponent(fields)}`;

        while (nextUrl) {
            const tracksResponse = await axios.get(nextUrl, { headers: { 'Authorization': token } });
            const tracks = tracksResponse.data.items
                .map(item => item.track)
                .filter(track => track && track.id); 
            allTracks = [...allTracks, ...tracks];
            nextUrl = tracksResponse.data.next;
        }

        // --- REMOVED THE FAILING AUDIO FEATURES CALL ---

        // Step 2: (Placeholder) Prepare for OpenAI Lyrical Analysis
        // For now, we will just return a temporary success message and the track list
        // In the next step, we will integrate OpenAI here.
        
        const temporaryMoodProfile = {
            primaryMood: "Lyrical Analysis Pending",
            tags: allTracks.slice(0, 3).map(t => t.name), // Show first 3 track names as example tags
            averages: { // Dummy data to prevent frontend from breaking
                energy: 50,
                happiness: 50,
                danceability: 50,
                tempo: 120
            }
        };

        res.status(200).json(temporaryMoodProfile);

    } catch (error) {
        console.error("--- DETAILED PLAYLIST ANALYSIS ERROR ---");
        if (error.response) {
            console.error("Data:", error.response.data);
            console.error("Status:", error.response.status);
        } else {
            console.error("Error Message:", error.message);
        }
        console.error("--- END OF ERROR ---");
        res.status(error.response?.status || 500).json({ error: 'Failed to analyze playlist.' });
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
