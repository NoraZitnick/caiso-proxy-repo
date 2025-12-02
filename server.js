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

const webpush = require("web-push");

app.use(express.json());

// -------------------------------
// 1. --- VAPID KEYS ---
// -------------------------------
// Generate once:
//    npx web-push generate-vapid-keys
webpush.setVapidDetails(
  "mailto:noreply@example.com",
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

// -------------------------------
// 2. --- STORE SUBSCRIPTIONS ---
// -------------------------------
// In memory (good for testing).
// In production: save to DB (Mongo, Redis, Postgres).
const subscriptions = {}; 
// Stored as: subscriptions[userId] = subscriptionObject;

// -------------------------------
// 3. --- USER SUBSCRIBES ---
// -------------------------------
app.post("/subscribe", (req, res) => {
  const { userId, subscription } = req.body;

  if (!userId || !subscription) {
    return res.status(400).json({ error: "Missing userId or subscription" });
  }

  subscriptions[userId] = subscription;

  res.status(201).json({ message: "Subscribed successfully" });
});

// -------------------------------
// 4. --- SEND NOTIFICATION TO ONE USER ---
// -------------------------------
app.post("/notify", async (req, res) => {
  const { userId, title, body } = req.body;

  if (!subscriptions[userId]) {
    return res.status(404).json({ error: "User not subscribed" });
  }

  const payload = JSON.stringify({ title, body });

  try {
    await webpush.sendNotification(subscriptions[userId], payload);
    res.json({ message: "Notification sent" });
  } catch (err) {
    console.error("Push error:", err);
    res.status(500).json({ error: "Failed to send push" });
  }
});

// -------------------------------
// 5. --- OPTIONAL: BROADCAST TO ALL USERS ---
// -------------------------------
app.post("/notify-all", async (req, res) => {
  const { title, body } = req.body;
  const payload = JSON.stringify({ title, body });

  const results = [];

  for (const [userId, subscription] of Object.entries(subscriptions)) {
    try {
      await webpush.sendNotification(subscription, payload);
      results.push({ userId, status: "sent" });
    } catch {
      results.push({ userId, status: "failed" });
    }
  }

  res.json(results);
});

// -------------------------------

app.listen(PORT, () => console.log("Server running on port", PORT));

const schedule = require("node-schedule");

schedule.scheduleJob("0 18 * * *", () => {
  webpush.sendNotification(
    subscriptions["nora123"],
    JSON.stringify({ title: "Reminder", body: "Run dishwasher now!" })
  );
});