export const maxDuration = 60;
import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { enviarMensagemWhatsApp } from '@/lib/whatsapp';
import { Transacao } from '@/lib/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    console.log('[CRON] Iniciando rotina de Lembretes Diários (Contas a Pagar e Receber)...');

    const db = adminDb!;
    const hojeData = new Date();
    const hojeStr = format(hojeData, 'yyyy-MM-dd');
    const displayData = format(hojeData, 'dd/MM/yyyy');

    // Suporte a chamada parametrizada por licença (Multi-tenant SaaS)
    const { searchParams } = new URL(request.url);
    const paramTenantId = searchParams.get('tenantId');
    const paramNumero = searchParams.get('numero');
    const paramNome = searchParams.get('nome');

    // 1. Carregar configurações gerais do WhatsApp e do Tenant
    const configSnap = await db.collection('configuracoes').doc('geral').get();
    const configData = configSnap.exists ? configSnap.data() : {};

    const apiUrl = configData?.whatsappApiUrl;
    const apiToken = configData?.whatsappApiToken;
    const telefoneMaster = paramNumero || configData?.whatsappNumeroMaster || configData?.telefoneWhatsApp;
    const tenantId = paramTenantId || configData?.whatsappTenantId || 'autocred-promotora-de-credito';
    const nomeSistema = paramNome || configData?.nomeSistema || 'Autocred Promotora';

    if (!telefoneMaster) {
      return NextResponse.json({ error: 'Nenhum telefone master configurado.' }, { status: 400 });
    }

    // 2. Definir caminho da coleção do tenant
    const isMasterTenant = !tenantId || tenantId === 'master';
    const transacoesPath = isMasterTenant ? 'transacoes' : `tenants/${tenantId}/transacoes`;
    console.log(`[CRON LEMBRETES] Buscando transações em: ${transacoesPath}`);

    // 3. Buscar todas as transações pendentes/atrasadas
    const transSnap = await db.collection(transacoesPath)
      .where('status', 'in', ['pendente', 'atrasado'])
      .get();

    const transacoes = transSnap.docs.map(d => ({ id: d.id, ...d.data() } as Transacao));

    // Filtrar Contas a Pagar (Despesas)
    const pagarHoje = transacoes.filter(t => 
      t.tipo === 'despesa' && 
      t.formaPagamento !== 'cartao_credito' &&
      (t.dataVencimento === hojeStr || (!t.dataVencimento && t.data === hojeStr))
    );

    const pagarAtrasadas = transacoes.filter(t => 
      t.tipo === 'despesa' && 
      t.formaPagamento !== 'cartao_credito' &&
      ((t.dataVencimento && t.dataVencimento < hojeStr) || (!t.dataVencimento && t.data < hojeStr))
    );

    // Filtrar Contas a Receber (Receitas)
    const receberHoje = transacoes.filter(t => 
      t.tipo === 'receita' && 
      (t.dataVencimento === hojeStr || (!t.dataVencimento && t.data === hojeStr))
    );

    const receberAtrasadas = transacoes.filter(t => 
      t.tipo === 'receita' && 
      ((t.dataVencimento && t.dataVencimento < hojeStr) || (!t.dataVencimento && t.data < hojeStr))
    );

    const totalPagarHoje = pagarHoje.reduce((acc, t) => acc + Number(t.valor || 0), 0);
    const totalPagarAtrasadas = pagarAtrasadas.reduce((acc, t) => acc + Number(t.valor || 0), 0);
    const totalReceberHoje = receberHoje.reduce((acc, t) => acc + Number(t.valor || 0), 0);
    const totalReceberAtrasadas = receberAtrasadas.reduce((acc, t) => acc + Number(t.valor || 0), 0);

    const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    // Se não há nenhuma pendência hoje nem em atraso
    if (pagarHoje.length === 0 && pagarAtrasadas.length === 0 && receberHoje.length === 0 && receberAtrasadas.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'Nenhuma conta a pagar ou receber pendente para hoje ou em atraso. Nenhuma mensagem necessária.' 
      });
    }

    // 4. Montar a mensagem do WhatsApp
    let texto = `🔔 *Lembrete Financeiro - ${displayData}*\n`;
    texto += `*${nomeSistema}*\n\n`;

    // CONTAS A RECEBER HOJE
    if (receberHoje.length > 0) {
      texto += `🟢 *CONTAS A RECEBER HOJE (${receberHoje.length}):*\n`;
      texto += `Total: *${fmt(totalReceberHoje)}*\n`;
      receberHoje.forEach(t => {
        const cliente = t.clienteNome || t.fornecedorNome || t.descricao || 'Receita';
        texto += `• ${cliente}: ${fmt(Number(t.valor))}\n`;
      });
      texto += `\n`;
    }

    // CONTAS A PAGAR HOJE
    if (pagarHoje.length > 0) {
      texto += `🔴 *CONTAS A PAGAR HOJE (${pagarHoje.length}):*\n`;
      texto += `Total: *${fmt(totalPagarHoje)}*\n`;
      pagarHoje.forEach(t => {
        const fornecedor = t.fornecedorNome || t.descricao || 'Despesa';
        texto += `• ${fornecedor}: ${fmt(Number(t.valor))}\n`;
      });
      texto += `\n`;
    }

    // CONTAS A RECEBER ATRASADAS
    if (receberAtrasadas.length > 0) {
      texto += `⚠️ *RECEBIMENTOS EM ATRASO (${receberAtrasadas.length}):*\n`;
      texto += `Total: ${fmt(totalReceberAtrasadas)}\n`;
      receberAtrasadas.slice(0, 5).forEach(t => {
        const dataVenc = t.dataVencimento ? t.dataVencimento.split('-').reverse().join('/') : t.data.split('-').reverse().join('/');
        texto += `• ${t.descricao}: ${fmt(Number(t.valor))} (Venc: ${dataVenc})\n`;
      });
      if (receberAtrasadas.length > 5) {
        texto += `_... e mais ${receberAtrasadas.length - 5} recebimentos em atraso_\n`;
      }
      texto += `\n`;
    }

    // CONTAS A PAGAR ATRASADAS
    if (pagarAtrasadas.length > 0) {
      texto += `🚨 *PAGAMENTOS EM ATRASO (${pagarAtrasadas.length}):*\n`;
      texto += `Total: ${fmt(totalPagarAtrasadas)}\n`;
      pagarAtrasadas.slice(0, 5).forEach(t => {
        const dataVenc = t.dataVencimento ? t.dataVencimento.split('-').reverse().join('/') : t.data.split('-').reverse().join('/');
        texto += `• ${t.descricao}: ${fmt(Number(t.valor))} (Venc: ${dataVenc})\n`;
      });
      if (pagarAtrasadas.length > 5) {
        texto += `_... e mais ${pagarAtrasadas.length - 5} contas atrasadas_\n`;
      }
      texto += `\n`;
    }

    texto += `_Acesse o sistema para liquidar os pagamentos e recebimentos._`;

    // 5. Enviar via WhatsApp com as credenciais da Evolution API
    console.log(`[CRON LEMBRETES] Enviando notificação para ${telefoneMaster}...`);
    const resultado = await enviarMensagemWhatsApp(telefoneMaster, texto, apiUrl, apiToken);

    return NextResponse.json({
      success: true,
      message: 'Lembrete diário enviado com sucesso!',
      telefone: telefoneMaster,
      resultadoZap: resultado,
      totais: {
        pagarHoje: { qtd: pagarHoje.length, valor: totalPagarHoje },
        receberHoje: { qtd: receberHoje.length, valor: totalReceberHoje },
        pagarAtrasadas: { qtd: pagarAtrasadas.length, valor: totalPagarAtrasadas },
        receberAtrasadas: { qtd: receberAtrasadas.length, valor: totalReceberAtrasadas },
      },
      mensagemPreview: texto
    });

  } catch (error: any) {
    console.error('[CRON LEMBRETES] Erro ao executar:', error);
    return NextResponse.json({ error: error.message || 'Erro ao processar lembretes' }, { status: 500 });
  }
}
