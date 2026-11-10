// src/lib/push.ts
/**
 * Helper utilities for Web Push notifications.
 * Uses the `web-push` library and VAPID keys.
 */
import webPush from 'web-push';

// Chaves VAPID padrão embutidas para funcionamento imediato sem necessidade de configurar env vars
const DEFAULT_VAPID_PUBLIC_KEY = 'BC539n2pNdv39O7fC8-RYm8ffBhtB0D_L9s7GQEQydxIR_8RzAj3w7nQCPCiarG4kgmlqto1zXjPZlSQiXWMick';
const DEFAULT_VAPID_PRIVATE_KEY = '-zkYdHPYLecnsIkMWexnagO81jAD9GyKAqbmbUkwaCw';
const DEFAULT_VAPID_SUBJECT = 'mailto:admin@autocred.com';

const vapidPublicKey = process.env.VAPID_PUBLIC_KEY || DEFAULT_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || DEFAULT_VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT || DEFAULT_VAPID_SUBJECT;

webPush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

/**
 * Send a push notification to a single subscription.
 * @param subscription The PushSubscription object stored in Firestore.
 * @param payload JSON payload that will be stringified.
 */
export async function sendPushNotification(subscription: any, payload: any) {
  if (!subscription) {
    return { success: false, error: 'No subscription provided' };
  }
  const payloadString = JSON.stringify(payload);
  try {
    await webPush.sendNotification(subscription, payloadString);
    return { success: true };
  } catch (err: any) {
    console.error('[PUSH ERROR]', err);
    return { success: false, error: err.message };
  }
}

/** Return the public VAPID key for the client */
export function getVapidPublicKey() {
  return vapidPublicKey;
}
