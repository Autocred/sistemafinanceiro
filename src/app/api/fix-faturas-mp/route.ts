import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

// Recalcula o ciclo de fatura no servidor (mesma lógica do cartao-utils.ts)
function calcularCicloFatura(dataCompraStr: string, diaFechamento: number, diaVencimento: number) {
  const [anoStr, mesStr, diaStr] = dataCompraStr.split('-');
  const anoCompra = parseInt(anoStr, 10);
  const mesCompra = parseInt(mesStr, 10);
  const diaCompra = parseInt(diaStr, 10);

  // Para mesReferencia, a lógica é: se compra > fechamento → próximo mês
  // Aqui recebemos o mesReferencia diretamente, então só calculamos o vencimento

  // O vencimento cai no mês seguinte ao mesFatura se diaVencimento <= diaFechamento
  let mesFatura = mesCompra;
  let anoFatura = anoCompra;

  if (diaCompra > diaFechamento) {
    mesFatura += 1;
    if (mesFatura > 12) { mesFatura = 1; anoFatura += 1; }
  }

  let mesVencimento = mesFatura;
  let anoVencimento = anoFatura;
  if (diaVencimento <= diaFechamento) {
    mesVencimento += 1;
    if (mesVencimento > 12) { mesVencimento = 1; anoVencimento += 1; }
  }

  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    mesReferencia: `${anoFatura}-${pad(mesFatura)}`,
    dataFechamento: `${anoFatura}-${pad(mesFatura)}-${pad(diaFechamento)}`,
    dataVencimento: `${anoVencimento}-${pad(mesVencimento)}-${pad(diaVencimento)}`,
  };
}

export async function GET() {
  try {
    if (!adminDb) return NextResponse.json({ error: 'No admin db' }, { status: 500 });

    const results: any[] = [];
    const TENANT = 'tenants/9yxuafoC0AV9BrIKem05ponbmgn2';

    // Busca o cartão Mercado Pago para pegar fechamento/vencimento
    const cartoesSnap = await adminDb.collection(`${TENANT}/cartoes`).get();
    const cartaoMP = cartoesSnap.docs
      .map(d => ({ id: d.id, ...d.data() } as any))
      .find(c => c.nome === 'Mercado Pago');

    if (!cartaoMP) {
      return NextResponse.json({ error: 'Cartão Mercado Pago não encontrado' }, { status: 404 });
    }

    const diaFechamento = cartaoMP.dataFechamento || 28;
    const diaVencimento = cartaoMP.dataVencimento || 4;

    // Busca todas as faturas do Mercado Pago que não estão pagas
    const faturasSnap = await adminDb.collection(`${TENANT}/faturas`)
      .where('cartaoId', '==', cartaoMP.id)
      .get();

    for (const fatDoc of faturasSnap.docs) {
      const fat = fatDoc.data() as any;
      if (fat.status === 'paga') continue;

      // Para cada fatura, calcula o vencimento correto com base no mesReferencia
      const [anoRef, mesRef] = (fat.mesReferencia || '').split('-').map(Number);
      if (!anoRef || !mesRef) continue;

      // O vencimento correto: se diaVencimento <= diaFechamento → próximo mês do mesReferencia
      const pad = (n: number) => String(n).padStart(2, '0');
      let mesVenc = mesRef;
      let anoVenc = anoRef;
      if (diaVencimento <= diaFechamento) {
        mesVenc += 1;
        if (mesVenc > 12) { mesVenc = 1; anoVenc += 1; }
      }

      const correctDue = `${anoVenc}-${pad(mesVenc)}-${pad(diaVencimento)}`;
      const correctClose = `${anoRef}-${pad(mesRef)}-${pad(diaFechamento)}`;

      const changed = fat.dataVencimento !== correctDue || fat.dataFechamento !== correctClose;

      if (changed) {
        await fatDoc.ref.update({
          dataVencimento: correctDue,
          dataFechamento: correctClose,
        });
        results.push({
          faturaId: fatDoc.id,
          mesReferencia: fat.mesReferencia,
          vencimentoAnterior: fat.dataVencimento,
          vencimentoCorrigido: correctDue,
          fechamentoCorrigido: correctClose,
        });
      }
    }

    // Também corrige os lançamentos vinculados às faturas corrigidas
    // para que o campo dataVencimento deles reflita o vencimento correto
    for (const r of results) {
      const fatSnap = await adminDb.collection(`${TENANT}/faturas`).doc(r.faturaId).get();
      const fat = fatSnap.data() as any;
      if (fat?.transacaoIds?.length) {
        for (const tid of fat.transacaoIds) {
          await adminDb.collection(`${TENANT}/transacoes`).doc(tid).update({
            dataVencimento: r.vencimentoCorrigido,
          });
        }
      }
    }

    return NextResponse.json({
      cartao: { nome: cartaoMP.nome, diaFechamento, diaVencimento },
      message: `Corrigidas ${results.length} fatura(s)`,
      correcoes: results,
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
