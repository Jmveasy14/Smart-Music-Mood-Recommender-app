// Description: Main entry point for the Node.js Express backend.

// --- Imports ---
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const querystring = 'querystring';
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

// unchanged /api/auth/login route...
app.get('/api/auth/login', (req, res) => {
    const state = generateRandomString(16);
    res.cookie(stateKey, state);
    const scope = 'user-read-private user-read-email playlist-read-private playlist-read-collaborative';
    res.redirect('https://accounts.spotify.com/authorize?' +
        require('querystring').stringify({
            response_type: 'code',
            client_id: SPOTIFY_CLIENT_ID,
            scope: scope,
            redirect_uri: SPOTIFY_REDIRECT_URI,
            state: state
        }));
});

// unchanged /api/auth/callback route...
app.get('/api/auth/callback', async (req, res) => {
    const code = req.query.code || null;
    const state = req.query.state || null;
    const storedState = req.cookies ? req.cookies[stateKey] : null;

    if (state === null || state !== storedState) {
        res.redirect(`${FRONTEND_URI}/#?error=state_mismatch`);
    } else {
        res.clearCookie(stateKey);
        try {
            const response = await axios({
                method: 'post',
                url: 'https://accounts.spotify.com/api/token',
                data: require('querystring').stringify({
                    grant_type: 'authorization_code',
                    code: code,
                    redirect_uri: SPOTIFY_REDIRECT_URI
                }),
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': 'Basic ' + (Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64')),
                }
            });
            const { access_token, refresh_token, expires_in } = response.data;
            res.redirect(`${FRONTEND_URI}/#` + require('querystring').stringify({ access_token, refresh_token, expires_in }));
        } catch (error) {
            console.error(error);
            res.redirect(`${FRONTEND_URI}/#?error=invalid_token`);
        }
    }
});

// unchanged /api/playlists route...
app.get('/api/playlists', async (req, res) => {
    const token = req.headers.authorization;
    if (!token) return res.status(401).json({ error: 'Authorization token not provided.' });

    try {
        const response = await axios.get('https://api.spotify.com/v1/me/playlists', { headers: { 'Authorization': token } });
        res.status(200).json(response.data);
    } catch (error) {
        console.error("Error fetching playlists:", error.response ? error.response.data : error.message);
        res.status(error.response?.status || 500).json({ error: 'Failed to fetch playlists.' });
    }
});

/**
 * @route   GET /api/playlist/:id
 * @desc    Fetches tracks and audio features for a specific playlist.
 * @access  Private (requires access token)
 */
app.get('/api/playlist/:id', async (req, res) => {
    const token = req.headers.authorization;
    const playlistId = req.params.id;

    if (!token) return res.status(401).json({ error: 'Authorization token not provided.' });

    try {
        // Step 1: Fetch all tracks from the playlist, handling pagination
        let allTracks = [];
        let nextUrl = `https://api.spotify.com/v1/playlists/${playlistId}/tracks?fields=items(track(id)),next`;

        while (nextUrl) {
            const tracksResponse = await axios.get(nextUrl, { headers: { 'Authorization': token } });
            const tracks = tracksResponse.data.items
                .map(item => item.track)
                .filter(track => track && track.id); // Filter out any null tracks
            allTracks = [...allTracks, ...tracks];
            nextUrl = tracksResponse.data.next;
        }

        const trackIds = allTracks.map(track => track.id);

        // Step 2: Fetch audio features for all tracks in batches of 100
        let allAudioFeatures = [];
        for (let i = 0; i < trackIds.length; i += 100) {
            const batchIds = trackIds.slice(i, i + 100);
            const featuresResponse = await axios.get(`https://api.spotify.com/v1/audio-features?ids=${batchIds.join(',')}`, {
                headers: { 'Authorization': token }
            });
            allAudioFeatures = [...allAudioFeatures, ...featuresResponse.data.audio_features];
        }

        // For now, just send back the raw features. We will add aggregation later.
        res.status(200).json({ audio_features: allAudioFeatures.filter(f => f) }); // Filter out null features

    } catch (error) {
        console.error("Error fetching playlist data:", error.response ? error.response.data : error.message);
        res.status(error.response?.status || 500).json({ error: 'Failed to fetch playlist data.' });
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
