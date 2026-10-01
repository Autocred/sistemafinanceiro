import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    message: 'Para recriar os lançamentos perdidos, use o formulário de lançamento no sistema.',
    instrucoes: [
      '1. Abra o sistema e vá em Lançamentos',
      '2. Crie um novo lançamento de Despesa:',
      '   - Descrição: Loovi Seguros',
      '   - Valor: R$ 194,00',  
      '   - Data: 30/09/2026',
      '   - Forma de Pagamento: Cartão de Crédito → Mercado Pago',
      '   - O sistema calculará automaticamente: Fatura 2026-10, Vencimento 04/11/2026',
      '3. Os demais lançamentos da fatura anterior (R$ 1.249,36 total) precisam ser relançados individualmente'
    ]
  });
}
