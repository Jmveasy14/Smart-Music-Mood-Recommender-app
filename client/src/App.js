// client/src/App.js
// Main component for the VibeCast React frontend

import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import axios from 'axios';

// --- NEW: Play and Pause SVG Icons ---
const PlayIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"></path></svg>
);
const PauseIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"></path></svg>
);


function App() {
  // State for authentication & data
  const [accessToken, setAccessToken] = useState(null);
  const [playlists, setPlaylists] = useState([]);
  const [analysisData, setAnalysisData] = useState(null);
  const [selectedPlaylistName, setSelectedPlaylistName] = useState('');

  // State for UI control
  const [appState, setAppState] = useState('login'); // 'login', 'playlists', 'analyzing', 'results'
  const [loadingMessage, setLoadingMessage] = useState('');

  // --- NEW: State for Audio Player ---
  const [playingUrl, setPlayingUrl] = useState(null);
  const audioRef = useRef(null); // Use a ref to hold the audio object

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
        const response = await axios.get(`/api/playlists`, {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        setPlaylists(response.data.items);
      } catch (error) { console.error("Error fetching playlists:", error); }
      setLoadingMessage('');
    };
    fetchPlaylists();
  }, [appState, accessToken]);

  // Cleanup effect for audio when component unmounts
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);


  // --- Handlers ---

  const handlePlaylistClick = async (playlist) => {
    if (audioRef.current) { audioRef.current.pause(); } // Stop music when analyzing new list
    setPlayingUrl(null);

    setAppState('analyzing');
    setSelectedPlaylistName(playlist.name);
    setLoadingMessage(`Casting the vibe for "${playlist.name}"...`);
    
    try {
        const response = await axios.get(`/api/playlist/${playlist.id}`, {
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
      if (audioRef.current) { audioRef.current.pause(); }
      setPlayingUrl(null);
      setAnalysisData(null);
      setAppState('playlists');
  };

  const togglePlay = (url) => {
    if (playingUrl === url) {
      // If the clicked song is already playing, pause it
      audioRef.current.pause();
      setPlayingUrl(null);
    } else {
      // If a different song is playing, pause it first
      if (audioRef.current) {
        audioRef.current.pause();
      }
      // Play the new song
      const newAudio = new Audio(url);
      audioRef.current = newAudio;
      setPlayingUrl(url);
      newAudio.play();
      // Listen for when the song ends to reset the state
      newAudio.addEventListener('ended', () => setPlayingUrl(null));
    }
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
          if (!analysisData) {
              return <p>No analysis data available.</p>;
          }
          return (
              <div className="results-container">
                  <h2>The VibeCast for "{selectedPlaylistName}" is...</h2>
                  <div className="mood-display">
                    <p className="primary-mood">{analysisData.primaryMood}</p>
                    <div className="tags-container">
                        {analysisData.tags && analysisData.tags.map(tag => <span key={tag} className="mood-tag">{tag}</span>)}
                    </div>
                  </div>

                  {analysisData.recommendedSong && (
                    <div className="recommendation-container">
                        <h3>Vibe-Matched Song</h3>
                        <div className="song-card">
                            <div className="song-art-container">
                                <img src={analysisData.recommendedSong.coverArt || 'https://placehold.co/150x150/181818/b3b3b3?text=?'} alt="Recommended song cover" />
                                {analysisData.recommendedSong.previewUrl && (
                                    <button className="play-button" onClick={() => togglePlay(analysisData.recommendedSong.previewUrl)}>
                                        {playingUrl === analysisData.recommendedSong.previewUrl ? <PauseIcon/> : <PlayIcon/>}
                                    </button>
                                )}
                            </div>
                            <div className="song-details">
                                <p className="song-name">{analysisData.recommendedSong.name}</p>
                                <p className="song-artist">{analysisData.recommendedSong.artist}</p>
                                <p className="song-reason">"{analysisData.recommendedSong.reason}"</p>
                            </div>
                        </div>
                    </div>
                  )}

                  <div className="suggestions-container">
                      <h3>Activity Suggestions</h3>
                      <ul>
                          {analysisData.activitySuggestions && analysisData.activitySuggestions.map(activity => (
                              <li key={activity} className="suggestion-item">{activity}</li>
                          ))}
                      </ul>
                  </div>

                  <button className="spotify-button" onClick={handleAnalyzeAnother}>Analyze Another</button>
              </div>
          );

      default: // 'login' state
        return (
          <div className="login-container">
            <h1 className="login-title">VibeCast</h1>
            <p className="login-tagline">Forecast your vibe. Find your next move.</p>
            <a className="spotify-button" href={`/api/auth/login`}>
              ♫ Connect with Spotify
            </a>
          </div>
        );
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        {appState !== 'login' && <h1 className="main-title">VibeCast</h1>}
        {renderContent()}
      </header>
    </div>
  );
}

export default App;
