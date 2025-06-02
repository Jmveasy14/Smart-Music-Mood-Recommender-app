// server.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/spotify', require('./routes/spotify'));
app.use('/api/analysis', require('./routes/analysis'));

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});