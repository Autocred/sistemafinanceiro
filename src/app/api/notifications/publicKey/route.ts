// src/app/api/notifications/publicKey/route.ts
import { NextResponse } from 'next/server';
import { getVapidPublicKey } from '@/lib/push'; // corrected import path

/**
 * GET /api/notifications/publicKey
 * Returns the VAPID public key for push subscription.
 */
export async function GET() {
  try {
    const publicKey = getVapidPublicKey();
    return NextResponse.json({ publicKey });
  } catch (e) {
    console.error('[PUBLIC KEY] Error', e);
    return NextResponse.json({ error: 'Failed to get public key' }, { status: 500 });
  }
}
