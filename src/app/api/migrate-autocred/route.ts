import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function POST(request: Request) {
  try {
    const { rows } = await request.json();
    if (!adminDb) return NextResponse.json({ error: 'No adminDb' }, { status: 500 });
    if (!rows || !Array.isArray(rows)) return NextResponse.json({ error: 'Invalid rows' }, { status: 400 });

    const tenantId = 'autocred-promotora-de-credito';
    const batchArray = [];
    batchArray.push(adminDb.batch());
    let operationCounter = 0;
    let batchIndex = 0;

    const tenantRef = adminDb.collection('tenants').doc(tenantId);
    
    // First, let's create a default account for them
    const contaId = 'conta-padrao-caixa';
    const contaRef = tenantRef.collection('contas').doc(contaId);
    batchArray[batchIndex].set(contaRef, {
      nome: 'Caixa Principal',
      tipo: 'caixa',
      saldo: 0,
      cor: '#3B82F6',
      icone: 'wallet',
      ativo: true
    }, { merge: true });
    operationCounter++;

    // To prevent ID collisions and organize, we'll hash/sanitize the categories or just use basic UUIDs
    const getSafeId = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
    const processedCategorias = new Set();

    for (const row of rows) {
      // row: { data, tipo, descricao, categoria, valor, status }
      const catId = getSafeId(row.categoria);
      if (!processedCategorias.has(catId)) {
        processedCategorias.add(catId);
        const catRef = tenantRef.collection('categorias').doc(catId);
        batchArray[batchIndex].set(catRef, {
          nome: row.categoria,
          tipo: row.tipo === 'receita' ? 'receita' : row.tipo === 'despesa' ? 'despesa' : 'ambos',
          cor: row.tipo === 'receita' ? '#10B981' : '#EF4444',
          icone: 'tag'
        }, { merge: true });
        operationCounter++;
      }

      const transacaoRef = tenantRef.collection('transacoes').doc();
      const [year, month, day] = row.data.split('-');
      
      let mappedStatus = 'pendente';
      if (row.status === 'recebido' || row.status === 'pago') mappedStatus = 'pago';
      
      let mappedTipo = row.tipo;
      if (mappedTipo !== 'receita' && mappedTipo !== 'despesa') mappedTipo = 'despesa'; // fallback

      batchArray[batchIndex].set(transacaoRef, {
        tipo: mappedTipo,
        descricao: row.descricao,
        valor: parseFloat(row.valor),
        data: row.data,
        dataCompetencia: `${year}-${month}`,
        status: mappedStatus,
        categoriaId: catId,
        categoriaNome: row.categoria,
        contaId: contaId,
        contaNome: 'Caixa Principal',
        formaPagamento: 'PIX', // default
        recorrente: false,
        parcelado: false
      });
      operationCounter++;

      if (operationCounter > 450) {
        batchArray.push(adminDb.batch());
        batchIndex++;
        operationCounter = 0;
      }
    }

    for (const batch of batchArray) {
      await batch.commit();
    }

    return NextResponse.json({ success: true, count: rows.length });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
