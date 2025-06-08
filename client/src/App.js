// client/src/App.js
// Main component for the VibeCast React frontend

import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  // State to hold the access token
  const [accessToken, setAccessToken] = useState(null);

  // This effect runs once when the component mounts
  useEffect(() => {
    // Check the URL's hash fragment for the access token
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
    
    // Clear the hash from the URL so the token isn't exposed
    window.location.hash = '';

    if (hash.access_token) {
      setAccessToken(hash.access_token);
    }
  }, []); // The empty array ensures this effect runs only once

  return (
    <div className="App">
      <header className="App-header">
        <h1>VibeCast</h1>
        
        {/* Conditional rendering based on login status */}
        {!accessToken ? (
          // If not logged in, show the login button
          <div>
            <p>Forecast your vibe. Find your next move.</p>
            {/* This button links to our backend's login route */}
            <a className="spotify-button" href="http://127.0.0.1:8888/api/auth/login">
              ♫ Connect with Spotify
            </a>
          </div>
        ) : (
          // If logged in, show a success message
          <div>
            <h2>Logged In Successfully!</h2>
            <p>We've connected to your Spotify account.</p>
            {/* In a real app, you would store this token securely and navigate away */}
          </div>
        )}
      </header>
    </div>
  );
}

export default App;
