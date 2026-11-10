// src/app/api/notifications/subscribe/route.ts
import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

/**
 * POST /api/notifications/subscribe
 * Body: { subscription: PushSubscription }
 * Saves the subscription under the authenticated user (uid) in Firestore.
 */
export async function POST(request: Request) {
  try {
    const { subscription, uid } = await request.json();
    if (!subscription || !uid) {
      return NextResponse.json({ error: 'subscription and uid required' }, { status: 400 });
    }
    const db = adminDb!;
    const subRef = db.collection('usuarios').doc(uid).collection('pushSubs').doc();
    await subRef.set({ subscription, createdAt: new Date().toISOString() });
    return NextResponse.json({ success: true, id: subRef.id });
  } catch (err: any) {
    console.error('[SUBSCRIBE] error', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
