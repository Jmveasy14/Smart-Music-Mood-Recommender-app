// VibeCast - Backend Server
// File: server.js
// Description: AI-Powered analysis backend using Google's free Gemini API.

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
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

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

// --- API Routes (Authentication & Playlist List - Unchanged) ---
app.get('/api/auth/login', (req, res) => {
    const state = generateRandomString(16);
    res.cookie(stateKey, state);
    const scope = 'user-read-private user-read-email playlist-read-private playlist-read-collaborative';
    const params = new URLSearchParams({
        response_type: 'code', client_id: SPOTIFY_CLIENT_ID, scope,
        redirect_uri: SPOTIFY_REDIRECT_URI, state, show_dialog: true
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
        const tokenParams = new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: SPOTIFY_REDIRECT_URI });
        const response = await axios({
            method: 'post', url: 'https://accounts.spotify.com/api/token', data: tokenParams,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': 'Basic ' + (Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64')),
            }
        });
        const { access_token, refresh_token, expires_in } = response.data;
        res.redirect(`${FRONTEND_URI}/#` + new URLSearchParams({ access_token, refresh_token, expires_in }).toString());
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

/**
 * @route   GET /api/playlist/:id
 * @desc    Fetches tracks, uses AI for analysis, and gets recommendation details.
 * @access  Private (requires access token)
 */
app.get('/api/playlist/:id', async (req, res) => {
    const token = req.headers.authorization;
    const playlistId = req.params.id;
    if (!token) return res.status(401).json({ error: 'Authorization token not provided.' });
    if (!GEMINI_API_KEY) return res.status(500).json({ error: 'Gemini API key not configured.' });

    try {
        // Step 1: Fetch tracks from Spotify
        let allTracks = [];
        const fields = 'items(track(id,name,artists(name))),next';
        let nextUrl = `https://api.spotify.com/v1/playlists/${playlistId}/tracks?fields=${encodeURIComponent(fields)}`;
        while (nextUrl) {
            const tracksResponse = await axios.get(nextUrl, { headers: { 'Authorization': token } });
            allTracks = [...allTracks, ...tracksResponse.data.items.map(item => item.track).filter(t => t && t.id)];
            nextUrl = tracksResponse.data.next;
        }

        // Step 2: Use Google Gemini to analyze the track list
        const trackList = allTracks.slice(0, 50).map(t => `${t.name} by ${t.artists.map(a => a.name).join(', ')}`).join('\n');
        
        const prompt = `
            Based on the following list of song titles from a Spotify playlist, perform a deep analysis.
            1. Determine the overall mood and primary vibe.
            2. Recommend ONE new song that fits this vibe perfectly but is NOT in the playlist.
            
            Return a JSON object with the exact following structure: 
            {
              "primaryMood": "string", 
              "tags": ["string"], 
              "activitySuggestions": ["string"],
              "recommendedSong": {
                  "name": "string",
                  "artist": "string",
                  "reason": "string"
              }
            }.

            - primaryMood: A short, descriptive name for the overall vibe.
            - tags: A list of 3-5 single-word tags describing the mood.
            - activitySuggestions: A list of 2-3 recommended activities.
            - recommendedSong: An object containing the name, artist, and a short, compelling reason why this song fits the playlist's vibe.

            Playlist Tracks:
            ${trackList}
        `;

        const geminiApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`;
        const geminiResponse = await axios.post(geminiApiUrl, {
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { response_mime_type: "application/json" }
        });

        const analysisResult = JSON.parse(geminiResponse.data.candidates[0].content.parts[0].text);
        
        // Step 3: Search Spotify for the recommended song to get its details
        if (analysisResult.recommendedSong) {
            const { name, artist } = analysisResult.recommendedSong;
            const searchQuery = `track:${name} artist:${artist}`;
            const searchUrl = `https://api.spotify.com/v1/search?q=${encodeURIComponent(searchQuery)}&type=track&limit=1`;
            
            try {
                const searchResponse = await axios.get(searchUrl, { headers: { 'Authorization': token } });
                if (searchResponse.data.tracks.items.length > 0) {
                    const track = searchResponse.data.tracks.items[0];
                    analysisResult.recommendedSong.coverArt = track.album.images[0]?.url;
                    // --- NEW: Add the preview URL to the response ---
                    analysisResult.recommendedSong.previewUrl = track.preview_url;
                }
            } catch (searchError) {
                console.error("Spotify search for recommended song failed:", searchError.message);
            }
        }
        
        res.status(200).json(analysisResult);

    } catch (error) {
        console.error("--- GEMINI ANALYSIS ERROR ---");
        if (error.response) {
            console.error("Data:", error.response.data);
            console.error("Status:", error.response.status);
        } else {
            console.error("Full Error:", error);
        }
        res.status(error.response?.status || 500).json({ error: 'Failed to complete Gemini AI analysis.' });
    }
});

app.get('/', (req, res) => { res.send('VibeCast Backend is alive!'); });
app.listen(PORT, () => { console.log(`✅ Server is running on http://127.0.0.1:${PORT}`); });
