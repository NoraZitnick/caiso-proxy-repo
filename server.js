const express = require('express');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;
const cors = require('cors');
app.use(cors());

app.get('/caiso-csv', async (req, res) => {
  try {
    const response = await fetch('https://www.caiso.com/outlook/current/rtm_forecast_7day.csv');
    if (!response.ok) {
      return res.status(response.status).send('Failed to fetch CSV.');
    }

    const csvText = await response.text();

    // Allow frontend to access this (CORS)
    res.set('Access-Control-Allow-Origin', '*');
    res.type('text/csv');
    res.send(csvText);
  } catch (error) {
    console.error('Error fetching CSV:', error);
    res.status(500).send('Server error.');
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
