# 🎵 VibeCast: Smart Music Recommender

<p align="center">
  <img src="Vibecast thumbnail.png" width="800" alt="VibeCast Screenshot">
</p>

**VibeCast** is a smart music recommender that analyzes your Spotify playlists to understand their underlying mood and vibe. Based on an AI-powered analysis of the tracklist, it suggests new activities and even a perfectly matched song to discover.

### ✨ Live Demo

> **[View the live application here!](https://your-frontend-url.vercel.app)** **Note:** This application operates under Spotify's "Development Mode" policy. For a live demo, please feel free to send me the email associated with your Spotify account, and I will be happy to grant you access immediately.

---

## 🚀 Key Features

* **Secure Spotify OAuth 2.0:** Securely log in with your Spotify account.
* **Playlist Analysis:** Fetches and displays all of your personal playlists.
* **AI-Powered Mood Detection:** Uses Google's Gemini API to perform a deep analysis of your playlist's tracklist, determining its primary mood, energy, and vibe.
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

### 1. Clone