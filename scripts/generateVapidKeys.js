// scripts/generateVapidKeys.js
// Simple script to generate VAPID keys for Web Push notifications.
// Run with `node scripts/generateVapidKeys.js` and copy the output to your env variables.

const webPush = require('web-push');

const vapidKeys = webPush.generateVAPIDKeys();
console.log('VAPID_PUBLIC_KEY:', vapidKeys.publicKey);
console.log('VAPID_PRIVATE_KEY:', vapidKeys.privateKey);
