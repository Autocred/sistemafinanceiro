export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function GET() {
  try {
    const faturasSnap = await adminDb!.collection('faturas').get();
    const faturas = faturasSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    const lancamentosSnap = await adminDb!.collection('lancamentos').get();
    const lancamentos = lancamentosSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    return NextResponse.json({
        faturas,
        lancamentos
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
