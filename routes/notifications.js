const express = require('express');
const router = express.Router();
const webPush = require('web-push');
const fs = require('fs');
const path = require('path');
const db = require('../db/db');

// Ensure VAPID keys are initialized
const keysPath = path.join(__dirname, '..', 'db', 'vapid_keys.json');
let vapidKeys;
if (fs.existsSync(keysPath)) {
  vapidKeys = JSON.parse(fs.readFileSync(keysPath, 'utf8'));
} else {
  vapidKeys = webPush.generateVAPIDKeys();
  fs.writeFileSync(keysPath, JSON.stringify(vapidKeys, null, 2), 'utf8');
}

webPush.setVapidDetails(
  'https://dr-hiral-portal.example.com',
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

// Get VAPID Public Key
router.get('/vapid-public-key', (req, res) => {
  res.json({ publicKey: vapidKeys.publicKey });
});

// Store Push Subscription
router.post('/subscribe', async (req, res) => {
  const { subscription } = req.body;
  if (!subscription || !subscription.endpoint) {
    return res.status(400).json({ error: 'Subscription endpoint is required' });
  }

  try {
    const auth = subscription.keys ? subscription.keys.auth : '';
    const p256dh = subscription.keys ? subscription.keys.p256dh : '';
    const endpoint = subscription.endpoint;

    // Check if subscription already exists
    const { rows } = await db.query('SELECT * FROM push_subscriptions WHERE endpoint = $1', [endpoint]);
    if (rows.length === 0) {
      await db.query(
        'INSERT INTO push_subscriptions (endpoint, p256dh, auth) VALUES ($1, $2, $3)',
        [endpoint, p256dh, auth]
      );
    }
    res.status(201).json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Helper function to send push notification to all stored subscribers
async function sendPushNotification(payload) {
  try {
    const { rows } = await db.query('SELECT * FROM push_subscriptions');
    const promises = rows.map(async (row) => {
      const pushSubscription = {
        endpoint: row.endpoint,
        keys: {
          p256dh: row.p256dh,
          auth: row.auth
        }
      };
      
      try {
        await webPush.sendNotification(pushSubscription, JSON.stringify(payload));
      } catch (err) {
        // If subscription has expired or is invalid, remove it from the DB
        if (err.statusCode === 410 || err.statusCode === 404) {
          console.log(`Removing expired subscription: ${row.endpoint}`);
          await db.query('DELETE FROM push_subscriptions WHERE endpoint = $1', [row.endpoint]);
        } else {
          console.error(`Error sending push notification to ${row.endpoint}:`, err);
        }
      }
    });

    await Promise.all(promises);
  } catch (e) {
    console.error('Error during sendPushNotification:', e);
  }
}

module.exports = {
  router,
  sendPushNotification
};
