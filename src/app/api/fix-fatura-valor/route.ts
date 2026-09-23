import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function GET() {
  try {
    if (!adminDb) return NextResponse.json({ error: 'No admin db' }, { status: 500 });

    const results: any[] = [];

    const TENANT = 'tenants/9yxuafoC0AV9BrIKem05ponbmgn2';

    // Busca todas as faturas do tenant correto
    const faturasSnap = await adminDb.collection(`${TENANT}/faturas`).get();
    
    for (const fatDoc of faturasSnap.docs) {
      const fat = fatDoc.data() as any;
      
      if (!fat.transacaoIds || fat.transacaoIds.length === 0) continue;

      // Recalcula o valorTotal somando todos os lancamentos vinculados
      let totalRecalculado = 0;
      for (const tid of fat.transacaoIds) {
        const tSnap = await adminDb.collection(`${TENANT}/transacoes`).doc(tid).get();
        if (tSnap.exists) {
          totalRecalculado += Math.abs(tSnap.data()?.valor || 0);
        }
      }

      const valorAtual = fat.valorTotal || 0;
      const diff = Math.abs(totalRecalculado - valorAtual);

      // So atualiza se houver diferenca
      if (diff > 0.01) {
        await fatDoc.ref.update({ valorTotal: totalRecalculado });
        results.push({
          faturaId: fatDoc.id,
          cartaoNome: fat.cartaoNome,
          mesReferencia: fat.mesReferencia,
          valorAnterior: valorAtual,
          valorCorrigido: totalRecalculado,
        });
      }
    }

    return NextResponse.json({
      message: `Corrigidas ${results.length} fatura(s)`,
      correcoes: results
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
