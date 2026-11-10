// src/app/api/notifications/test/route.ts
import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { sendPushNotification } from '@/lib/push';

/**
 * Endpoint de teste para disparar notificação push para todas as inscrições registradas.
 * GET /api/notifications/test
 * POST /api/notifications/test (aceita payload customizado ou inscrição direta)
 */
export async function GET(request: Request) {
  return handleTestNotification();
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    if (body.subscription) {
      // Envio direto para a assinatura enviada no body
      const payload = {
        title: body.title || '🔔 Alerta de Teste - AUTOCRED',
        body: body.body || 'Sua notificação foi configurada e está funcionando com sucesso!',
        url: '/central',
      };
      const result = await sendPushNotification(body.subscription, payload);
      return NextResponse.json({ status: 'ok', sent: 1, direct: true, result });
    }
  } catch (err) {
    console.warn('[TEST NOTIF] Falha ao ler body, buscando assinaturas salvas:', err);
  }
  return handleTestNotification();
}

async function handleTestNotification() {
  try {
    const db = adminDb;
    if (!db) {
      return NextResponse.json({ status: 'error', error: 'Firebase Admin Firestore não disponível' }, { status: 500 });
    }

    const subsSnap = await db.collectionGroup('pushSubs').get();
    const results: any[] = [];

    const payload = {
      title: '🔔 Notificação de Teste - AUTOCRED',
      body: 'Sistema Financeiro: As notificações push estão ativas e funcionando perfeitamente!',
      url: '/central',
    };

    for (const subDoc of subsSnap.docs) {
      const data = subDoc.data();
      const rawSub = data.subscription || data;
      if (rawSub && (rawSub.endpoint || rawSub.keys)) {
        const sendResult = await sendPushNotification(rawSub, payload);
        results.push({ subId: subDoc.id, sendResult });
      }
    }

    return NextResponse.json({
      status: 'ok',
      totalSubscriptions: subsSnap.size,
      sent: results.length,
      details: results,
    });
  } catch (e: any) {
    console.error('[TEST NOTIF] error', e);
    return NextResponse.json({ status: 'error', error: e.message }, { status: 500 });
  }
}
