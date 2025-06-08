// Main component for the VibeCast React frontend

import React, { useState, useEffect } from 'react';
import './App.css';
import axios from 'axios'; // Import axios to make API calls

function App() {
  // State to hold the access token
  const [accessToken, setAccessToken] = useState(null);
  // State to hold the playlists
  const [playlists, setPlaylists] = useState([]);
  // State for loading status
  const [loading, setLoading] = useState(false);

  // This effect runs once to get the token from the URL
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
    }
  }, []);

  // This effect runs whenever the accessToken changes
  useEffect(() => {
    // If we don't have a token, do nothing
    if (!accessToken) return;

    // This is an async function to fetch playlists
    const fetchPlaylists = async () => {
      setLoading(true);
      try {
        const response = await axios.get('http://127.0.0.1:8888/api/playlists', {
          headers: {
            // We send the token in the Authorization header
            'Authorization': `Bearer ${accessToken}`
          }
        });
        setPlaylists(response.data.items); // Spotify nests playlists in the 'items' array
      } catch (error) {
        console.error("Error fetching playlists:", error);
      }
      setLoading(false);
    };

    fetchPlaylists();
  }, [accessToken]); // The dependency array ensures this runs when accessToken is set

  return (
    <div className="App">
      <header className="App-header">
        <h1>VibeCast</h1>
        
        {/* Conditional rendering based on login status */}
        {!accessToken ? (
          // If not logged in, show the login button
          <div>
            <p>Forecast your vibe. Find your next move.</p>
            <a className="spotify-button" href="http://127.0.0.1:8888/api/auth/login">
              ♫ Connect with Spotify
            </a>
          </div>
        ) : (
          // If logged in, show the playlists
          <div className="playlists-container">
            <h2>Choose a Playlist to Analyze</h2>
            {loading ? (
              <p>Loading your playlists...</p>
            ) : (
              <div className="playlists-grid">
                {playlists.map((playlist) => (
                  <div key={playlist.id} className="playlist-item">
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
        )}
      </header>
    </div>
  );
}

export default App;
