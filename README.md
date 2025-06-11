# 🎵 VibeCast: Smart Music Recommender

<p align="center">
  <img src="Vibecast thumbnail.png" width="800" alt="VibeCast Screenshot">
</p>

**VibeCast** is a smart music recommender that analyzes your Spotify playlists to understand their underlying mood and vibe. Based on an AI-powered analysis of the tracklist, it suggests new activities and even a perfectly matched song to discover.

### ✨ Live Demo

> **[View the live application here!](https://vibecast-ashy.vercel.app/)**

**Note:** This application operates under Spotify's "Development Mode" policy. For a live demo, please feel free to send me the email associated with your Spotify account, and I will be happy to grant you access immediately.

---

## 🚀 Key Features

* **Secure Spotify OAuth 2.0:** Securely log in with your Spotify account.
* **Playlist Analysis:** Fetches and displays all of your personal playlists.
* **AI-Powered Mood Detection:** Uses Google's Gemini API to perform a deep analysis of your playlist's tracklist, determining its primary mood and vibe.
* **Intelligent Recommendations:**
    * Generates a list of suggested activities that match the playlist's mood.
    * Recommends a new, vibe-matched song for you to discover, complete with cover art fetched from the Spotify API.
* **Dynamic Frontend:** A responsive and visually appealing interface built with React.

---

## 🛠️ Tech Stack

* **Frontend:** React, Axios
* **Backend:** Node.js, Express
* **APIs:** Spotify Web API, Google Gemini API
* **Deployment:** Vercel

---

## ⚙️ Setup and Local Installation

To run this project on your local machine, follow these steps.

### Prerequisites

* Node.js (v18 or later)
* A Spotify Developer account
* A Google AI Studio account

### 1. Clone the Repository

```bash
git clone [https://github.com/your-username/Vibecast.git](https://github.com/your-username/Vibecast.git)
cd Vibecast
```

### 2. Configure Environment Variables

This project requires API keys to connect to Spotify and Google.

1.  Navigate into the `server` directory: `cd server`
2.  Create a new file named `.env`.
3.  Add the following variables to the `.env` file, replacing the placeholder values with your actual keys:

    ```env
    # Spotify API Credentials
    SPOTIFY_CLIENT_ID=your_spotify_client_id
    SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
    SPOTIFY_REDIRECT_URI=[http://127.0.0.1:8888/api/auth/callback](http://127.0.0.1:8888/api/auth/callback)
    
    # Google Gemini API Key
    GEMINI_API_KEY=your_google_gemini_api_key
    
    # Frontend URI for local development
    FRONTEND_URI=[http://127.0.0.1:3000](http://127.0.0.1:3000)
    ```

### 3. Install Dependencies

You will need to install dependencies for both the backend and frontend separately.

* **For the backend:**

    ```bash
    cd server
    npm install
    ```

* **For the frontend:**

    ```bash
    cd ../client
    npm install
    ```

### 4. Run the Application

You will need two separate terminal windows to run the application.

* **In your first terminal, start the backend server:**

    ```bash
    # Make sure you are in the /server directory
    node server.js
    ```
    *Your server should now be running at `http://127.0.0.1:8888`.*

* **In your second terminal, start the frontend client:**

    ```bash
    # Make sure you are in the /client directory
    npm start
    ```
    *This will automatically open your browser to `http://127.0.0.1:3000` where the app will be running.*

---

## 🌟 Acknowledgements

This project was a great learning experience in full-stack development, third-party API integration, and modern deployment practices.
