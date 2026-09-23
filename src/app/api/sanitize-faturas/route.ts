import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function GET() {
  try {
    const faturasRef = adminDb!.collection('faturas');
    const faturasSnap = await faturasRef.get();
    
    // Group by cartaoId + mesReferencia
    const grouped = new Map<string, any[]>();
    faturasSnap.forEach(doc => {
      const f = doc.data();
      f.id = doc.id;
      if (f.cartaoId && f.mesReferencia) {
        const key = `${f.cartaoId}_${f.mesReferencia}`;
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key)!.push(f);
      }
    });

    const report = {
      analisadas: faturasSnap.size,
      gruposComDuplicidades: 0,
      faturasRemovidas: 0,
      lancamentosConsolidados: 0,
      mensagens: [] as string[]
    };

    // For each group, check if there are > 1 faturas
    for (const [key, faturas] of grouped.entries()) {
      if (faturas.length > 1) {
        report.gruposComDuplicidades++;
        
        // Pick the primary fatura (e.g. the one with most transacaoIds or the most recently updated)
        faturas.sort((a, b) => (b.transacaoIds?.length || 0) - (a.transacaoIds?.length || 0));
        const primary = faturas[0];
        const duplicates = faturas.slice(1);
        
        // Merge transacaoIds
        const mergedTransacaoIds = new Set(primary.transacaoIds || []);
        
        for (const dup of duplicates) {
          const tIds = dup.transacaoIds || [];
          for (const tid of tIds) mergedTransacaoIds.add(tid);
        }
        
        const finalIds = Array.from(mergedTransacaoIds) as string[];
        
        // Calculate new total using all merged transacoes
        let newTotal = 0;
        for (const tid of finalIds) {
          const tDoc = await adminDb!.collection('transacoes').doc(tid).get();
          if (tDoc.exists) {
            newTotal += Math.abs(tDoc.data()?.valor || 0);
            
            // Fix the pointer on the transacao if it was pointing to a duplicate
            if (tDoc.data()?.faturaId !== primary.id) {
              await adminDb!.collection('transacoes').doc(tid).update({ faturaId: primary.id });
              report.lancamentosConsolidados++;
            }
          }
        }
        
        // Update the primary
        await adminDb!.collection('faturas').doc(primary.id).update({
          transacaoIds: finalIds,
          valorTotal: newTotal,
          atualizadoEm: new Date().toISOString()
        });
        
        report.mensagens.push(`Fatura consolidada: ${key}. Mantida ${primary.id}, novas transacoes: ${finalIds.length}, total: ${newTotal}`);
        
        // Delete duplicates
        for (const dup of duplicates) {
          await adminDb!.collection('faturas').doc(dup.id).delete();
          report.faturasRemovidas++;
          report.mensagens.push(`Removida fatura duplicada: ${dup.id} para o ciclo ${key}`);
        }
      }
    }

    return NextResponse.json({ success: true, report });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
