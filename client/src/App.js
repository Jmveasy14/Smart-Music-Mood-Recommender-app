// Main component for the VibeCast React frontend

import React, { useState, useEffect } from 'react';
import './App.css';
import axios from 'axios';

function App() {
  // State for authentication & data
  const [accessToken, setAccessToken] = useState(null);
  const [playlists, setPlaylists] = useState([]);
  const [analysisData, setAnalysisData] = useState(null);

  // State for UI control
  const [appState, setAppState] = useState('login'); // 'login', 'playlists', 'analyzing', 'results'
  const [loadingMessage, setLoadingMessage] = useState('');


  // --- Effects ---

  // On mount, check for access token in URL
  useEffect(() => {
    const hash = window.location.hash
      .substring(1)
      .split('&')
      .reduce((initial, item) => {
        if (item) {
          var parts = item.split('=');
          initial[parts[0]] = decodeURIComponent(parts[1]);
        }
        return initial;
      }, {});
    
    window.location.hash = '';

    if (hash.access_token) {
      setAccessToken(hash.access_token);
      setAppState('playlists');
    }
  }, []);

  // When we get an access token, fetch the user's playlists
  useEffect(() => {
    if (appState !== 'playlists' || !accessToken) return;

    const fetchPlaylists = async () => {
      setLoadingMessage('Loading your playlists...');
      try {
        const response = await axios.get('http://127.0.0.1:8888/api/playlists', {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        setPlaylists(response.data.items);
      } catch (error) {
        console.error("Error fetching playlists:", error);
      }
      setLoadingMessage('');
    };

    fetchPlaylists();
  }, [appState, accessToken]);


  // --- Handlers ---

  const handlePlaylistClick = async (playlist) => {
    if (!accessToken) return;

    setAppState('analyzing');
    setLoadingMessage(`Analyzing "${playlist.name}"...`);

    // In a real app, you'd show a sequence of messages
    // setTimeout(() => setLoadingMessage('Reading the rhythm...'), 1500);
    // setTimeout(() => setLoadingMessage('Decoding the lyrics...'), 3000);
    // setTimeout(() => setLoadingMessage('Casting the vibe...'), 4500);

    try {
        const response = await axios.get(`http://127.0.0.1:8888/api/playlist/${playlist.id}`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        setAnalysisData(response.data);
        console.log("Analysis Data Received:", response.data); // For testing
        setAppState('results'); // Move to results page
    } catch (error) {
        console.error("Error analyzing playlist:", error);
        setAppState('playlists'); // Go back to playlists on error
    }
    setLoadingMessage('');
  };


  // --- Render Logic ---

  const renderContent = () => {
    switch (appState) {
      case 'playlists':
        return (
          <div className="playlists-container">
            <h2>Choose a Playlist to Analyze</h2>
            {loadingMessage ? <p>{loadingMessage}</p> : (
              <div className="playlists-grid">
                {playlists.map((playlist) => (
                  <div key={playlist.id} className="playlist-item" onClick={() => handlePlaylistClick(playlist)}>
                    {playlist.images[0] ? (
                      <img src={playlist.images[0].url} alt={`${playlist.name} cover`} />
                    ) : (
                      <div className="playlist-placeholder-image">♫</div>
                    )}
                    <h3>{playlist.name}</h3>
                    <p>{playlist.tracks.total} tracks</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'analyzing':
        return (
          <div className="analyzing-container">
            <div className="spinner"></div>
            <p className="loading-text">{loadingMessage}</p>
          </div>
        );
      
      case 'results':
          // Placeholder for the results screen
          return (
              <div>
                  <h2>Analysis Complete!</h2>
                  <p>Check the console for the audio features data.</p>
                  <button className="spotify-button" onClick={() => setAppState('playlists')}>Analyze Another</button>
              </div>
          );

      default: // 'login' state
        return (
          <div>
            <p>Forecast your vibe. Find your next move.</p>
            <a className="spotify-button" href="http://127.0.0.1:8888/api/auth/login">
              ♫ Connect with Spotify
            </a>
          </div>
        );
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>VibeCast</h1>
        {renderContent()}
      </header>
    </div>
  );
}

export default App;

