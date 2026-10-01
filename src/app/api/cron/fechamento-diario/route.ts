import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { enviarMensagemWhatsApp } from '@/lib/whatsapp';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // Basic auth check if needed (vercel cron sends a bearer token)
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const hojeStr = format(new Date(), 'yyyy-MM-dd');
    const displayData = format(new Date(), "dd/MM/yyyy");

    // Precisamos percorrer todos os tenants para mandar extrato pros respectivos donos
    // Mas para simplificar (já que estamos usando muito o tenant Master), vamos buscar do master
    // Ou podemos buscar usuários que tenham um celular configurado em "configuracoes".
    
    // Como o firebase-admin tem acesso total, vamos pegar do tenant master primeiro
    // Idealmente você teria uma lista de contatos na config.
    
    // Buscar config global para pegar o celular do master
    const configSnap = await adminDb!.collection('configuracoes').doc('geral').get();
    let telefoneMaster = configSnap.exists ? configSnap.data()?.telefoneWhatsApp : process.env.WHATSAPP_NUMERO_MASTER;

    if (!telefoneMaster) {
      telefoneMaster = '5511999999999'; // Fallback / evitar erro se não tiver configurado ainda
      console.log('Telefone do Master não configurado. Usando mock.');
    }

    // Buscar transações de HOJE
    // Assumimos tenant root se for o master (conforme correções anteriores)
    const transacoesSnap = await adminDb!.collection('transacoes')
      .where('data', '==', hojeStr)
      .where('status', '==', 'pago')
      .get();

    let totalReceitas = 0;
    let totalDespesas = 0;
    const principais: any[] = [];

    transacoesSnap.forEach(doc => {
      const t = doc.data();
      const val = Number(t.valor);
      if (t.tipo === 'receita') {
        totalReceitas += val;
      } else {
        totalDespesas += val;
      }
      
      // Guardar os maiores lançamentos para o extrato (acima de R$ 0)
      principais.push({
        descricao: t.descricao || t.categoriaNome || 'Lançamento',
        valor: val,
        tipo: t.tipo
      });
    });

    const saldoDia = totalReceitas - totalDespesas;
    
    // Se não teve movimentação no dia, podemos pular ou mandar um aviso
    if (totalReceitas === 0 && totalDespesas === 0) {
      return NextResponse.json({ message: 'Nenhuma movimentação hoje. SMS não enviado.' });
    }

    // Formatação de moeda
    const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    // Ordenar principais por valor (maiores primeiro)
    principais.sort((a, b) => b.valor - a.valor);
    const top3 = principais.slice(0, 3);

    // Montar a mensagem
    let mensagem = `📊 *Resumo Diário - ${displayData}*\n\n`;
    mensagem += `🟢 *Entradas:* ${fmt(totalReceitas)}\n`;
    mensagem += `🔴 *Saídas:* ${fmt(totalDespesas)}\n\n`;
    
    const saldoTxt = saldoDia >= 0 ? 'positivo no dia' : 'negativo no dia';
    const bancoIcon = saldoDia >= 0 ? '🏦' : '📉';
    mensagem += `${bancoIcon} *Saldo do Dia:* ${fmt(Math.abs(saldoDia))} ${saldoTxt}\n`;

    if (top3.length > 0) {
      mensagem += `\n*Principais Movimentações:*\n`;
      top3.forEach(t => {
        const icon = t.tipo === 'receita' ? '🟢' : '🔴';
        mensagem += `- ${icon} ${t.descricao} (${fmt(t.valor)})\n`;
      });
    }

    mensagem += `\n_Gerado automaticamente por Autocred Finanças_`;

    // Enviar mensagem
    if (telefoneMaster && telefoneMaster !== '5511999999999') {
      await enviarMensagemWhatsApp(telefoneMaster, mensagem);
    } else {
      console.log('Mensagem simulada (telefone não real):', mensagem);
    }

    return NextResponse.json({ success: true, message: 'Fechamento diário enviado', resumo: mensagem });

  } catch (error: any) {
    console.error('Erro no cron fechamento diário:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
