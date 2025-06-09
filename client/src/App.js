// Main component for the VibeCast React frontend

import React, { useState, useEffect } from 'react';
import './App.css';
import axios from 'axios';

// A simple component to render a single stat
const Stat = ({ label, value }) => (
  <div className="stat-item">
    <div className="stat-value">{value}</div>
    <div className="stat-label">{label}</div>
  </div>
);

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

  // When appState changes to 'playlists', fetch the user's playlists
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
    
    try {
        const response = await axios.get(`http://127.0.0.1:8888/api/playlist/${playlist.id}`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        setAnalysisData(response.data);
        setAppState('results'); 
    } catch (error) {
        console.error("Error analyzing playlist:", error);
        setAppState('playlists');
    }
    setLoadingMessage('');
  };

  const handleAnalyzeAnother = () => {
      setAnalysisData(null);
      setAppState('playlists');
  }


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
          if (!analysisData) {
              return <p>No analysis data available.</p>;
          }
          return (
              <div className="results-container">
                  <h2>The VibeCast is...</h2>
                  <div className="mood-display">
                    <p className="primary-mood">{analysisData.primaryMood}</p>
                    <div className="tags-container">
                        {analysisData.tags.map(tag => <span key={tag} className="mood-tag">{tag}</span>)}
                    </div>
                  </div>
                  <div className="stats-container">
                    <Stat label="Energy" value={`${Math.round(analysisData.averages.energy * 100)}%`} />
                    <Stat label="Happiness" value={`${Math.round(analysisData.averages.valence * 100)}%`} />
                    <Stat label="Danceability" value={`${Math.round(analysisData.averages.danceability * 100)}%`} />
                    <Stat label="Avg. Tempo" value={`${Math.round(analysisData.averages.tempo)} BPM`} />
                  </div>
                  <button className="spotify-button" onClick={handleAnalyzeAnother}>Analyze Another</button>
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
