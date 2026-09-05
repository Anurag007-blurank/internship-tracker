// server.js
// Entry point: sets up Express, connects routes, and starts the scheduler.

require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const targetRoutes = require('./routes/targets');
const { startScheduler, checkAndNotify } = require('./scheduler');

const app = express();

app.use(cors());
app.use(express.json());

// Serve the simple frontend from the /public folder
app.use(express.static(path.join(__dirname, '..', 'public')));

// API routes
app.use('/auth', authRoutes);
app.use('/targets', targetRoutes);

// Manual trigger for testing the notification logic without waiting an hour
app.post('/run-check-now', async (req, res) => {
  await checkAndNotify();
  res.json({ ran: true });
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  startScheduler();
});
