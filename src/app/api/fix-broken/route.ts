import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function GET() {
  try {
    if (!adminDb) return NextResponse.json({ error: 'No admin db' }, { status: 500 });
    
    // Find transaction msgfygozufnxjy
    const tRef = adminDb.collection('transacoes').doc('msgfygozufnxjy');
    const tSnap = await tRef.get();
    if (!tSnap.exists) {
      return NextResponse.json({ message: 'Transaction msgfygozufnxjy not found' });
    }
    const tData = tSnap.data();

    // The correct Fatura for 2026-09 is msemqbcvznj3wz
    const fRef = adminDb.collection('faturas').doc('msemqbcvznj3wz');
    const fSnap = await fRef.get();
    if (!fSnap.exists) {
      return NextResponse.json({ message: 'Fatura msemqbcvznj3wz not found' });
    }
    const fData = fSnap.data() as any;

    // Link transaction to Fatura 2026-09
    let updatedFatura = false;
    let tIds = fData.transacaoIds || [];
    if (!tIds.includes('msgfygozufnxjy')) {
      tIds.push('msgfygozufnxjy');
      updatedFatura = true;
    }
    
    // Recalculate fatura total
    let total = 0;
    for (const tid of tIds) {
      const ts = await adminDb.collection('transacoes').doc(tid).get();
      if (ts.exists) {
        total += Math.abs(ts.data()?.valor || 0);
      }
    }
    
    // The transaction should have faturaId
    await tRef.update({ faturaId: 'msemqbcvznj3wz' });
    await fRef.update({ transacaoIds: tIds, valorTotal: total });

    // Find and delete the empty fatura 2026-10 (msgfynof9zbpes)
    const f10Ref = adminDb.collection('faturas').doc('msgfynof9zbpes');
    const f10Snap = await f10Ref.get();
    if (f10Snap.exists) {
       await f10Ref.delete();
    }

    return NextResponse.json({
      message: 'Fixed transaction and fatura',
      fatura202609: {
        id: 'msemqbcvznj3wz',
        oldTotal: fData.valorTotal,
        newTotal: total,
        tIds
      },
      deletedEmptyFatura: f10Snap.exists
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
