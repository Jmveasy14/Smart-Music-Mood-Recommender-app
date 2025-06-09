// VibeCast - Backend Server
// File: server.js
// Description: Main entry point for the Node.js Express backend.

// --- Imports ---
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const querystring = require('querystring'); // Import the module once at the top
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

app.get('/api/auth/login', (req, res) => {
    const state = generateRandomString(16);
    res.cookie(stateKey, state);
    const scope = 'user-read-private user-read-email playlist-read-private playlist-read-collaborative';
    
    // Use the querystring variable defined at the top of the file
    res.redirect('https://accounts.spotify.com/authorize?' +
        querystring.stringify({
            response_type: 'code',
            client_id: SPOTIFY_CLIENT_ID,
            scope: scope,
            redirect_uri: SPOTIFY_REDIRECT_URI,
            state: state
        }));
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
        const response = await axios({
            method: 'post',
            url: 'https://accounts.spotify.com/api/token',
            // Use the querystring variable consistently
            data: querystring.stringify({
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
        // Use the querystring variable consistently
        res.redirect(`${FRONTEND_URI}/#` + querystring.stringify({ access_token, refresh_token, expires_in }));
    } catch (error) {
        console.error("Error in /api/auth/callback:", error);
        res.redirect(`${FRONTEND_URI}/#?error=invalid_token`);
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


app.get('/api/playlist/:id', async (req, res) => {
    const token = req.headers.authorization;
    const playlistId = req.params.id;

    if (!token) return res.status(401).json({ error: 'Authorization token not provided.' });

    try {
        let allTracks = [];
        let nextUrl = `https://api.spotify.com/v1/playlists/${playlistId}/tracks?fields=items(track(id)),next`;

        while (nextUrl) {
            const tracksResponse = await axios.get(nextUrl, { headers: { 'Authorization': token } });
            allTracks = [...allTracks, ...tracksResponse.data.items.map(item => item.track).filter(t => t && t.id)];
            nextUrl = tracksResponse.data.next;
        }

        const trackIds = allTracks.map(track => track.id);

        let allAudioFeatures = [];
        for (let i = 0; i < trackIds.length; i += 100) {
            const batchIds = trackIds.slice(i, i + 100);
            const featuresResponse = await axios.get(`https://api.spotify.com/v1/audio-features?ids=${batchIds.join(',')}`, { headers: { 'Authorization': token } });
            allAudioFeatures = [...allAudioFeatures, ...featuresResponse.data.audio_features.filter(f => f)];
        }

        if (allAudioFeatures.length === 0) {
            return res.status(200).json({ error: "No audio features found for this playlist." });
        }
        
        const featureAverages = {
            danceability: allAudioFeatures.reduce((sum, f) => sum + f.danceability, 0) / allAudioFeatures.length,
            energy: allAudioFeatures.reduce((sum, f) => sum + f.energy, 0) / allAudioFeatures.length,
            valence: allAudioFeatures.reduce((sum, f) => sum + f.valence, 0) / allAudioFeatures.length,
            tempo: allAudioFeatures.reduce((sum, f) => sum + f.tempo, 0) / allAudioFeatures.length,
            acousticness: allAudioFeatures.reduce((sum, f) => sum + f.acousticness, 0) / allAudioFeatures.length,
        };

        const moodProfile = {
            primaryMood: '',
            tags: [],
            averages: featureAverages
        };

        if (featureAverages.valence > 0.65 && featureAverages.energy > 0.65) {
            moodProfile.primaryMood = "Euphoric & Energetic";
        } else if (featureAverages.valence > 0.5 && featureAverages.energy < 0.5) {
            moodProfile.primaryMood = "Happy & Chill";
        } else if (featureAverages.valence < 0.35 && featureAverages.energy < 0.4) {
            moodProfile.primaryMood = "Melancholic & Reflective";
        } else if (featureAverages.valence < 0.5 && featureAverages.energy > 0.7) {
            moodProfile.primaryMood = "Anxious & Intense";
        } else {
            moodProfile.primaryMood = "Neutral";
        }
        
        if (featureAverages.danceability > 0.7) moodProfile.tags.push("Highly Danceable");
        if (featureAverages.tempo > 140) moodProfile.tags.push("Fast-Paced");
        if (featureAverages.acousticness > 0.7) moodProfile.tags.push("Acoustic");

        res.status(200).json(moodProfile);

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
