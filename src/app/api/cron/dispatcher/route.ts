export const maxDuration = 60;
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function GET(request: Request) {
  try {
    const db = adminDb!;
    
    // Obter data e hora atual no fuso de Brasília (America/Sao_Paulo)
    const agoraSp = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(new Date());

    const hojeSp = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date()).split('/').reverse().join('-'); // YYYY-MM-DD

    console.log(`[DISPATCHER] Verificando agendamentos. Hora atual em Brasília: ${agoraSp} | Data: ${hojeSp}`);

    const configRef = db.collection('configuracoes').doc('geral');
    const configSnap = await configRef.get();
    const config = configSnap.exists ? configSnap.data() : {};

    const horarioLembretes = config?.whatsappHorarioLembretes || '08:00';
    const horarioFechamento = config?.whatsappHorarioFechamento || config?.whatsappHorario || '17:00';
    
    const ultimoEnvioLembretes = config?.ultimoEnvioLembretes;
    const ultimoEnvioFechamento = config?.ultimoEnvioFechamento;

    const resultados: any = {
      horaAtual: agoraSp,
      dataAtual: hojeSp,
      horariosConfigurados: {
        lembretes: horarioLembretes,
        fechamento: horarioFechamento
      },
      acoesDisparadas: []
    };

    const host = request.headers.get('host') || 'sistemafinanceiropessoal.vercel.app';
    const protocol = host.includes('localhost') ? 'http' : 'https';

    // 1. Checar se é hora do Lembrete de Contas a Pagar/Receber
    if (agoraSp === horarioLembretes && ultimoEnvioLembretes !== hojeSp) {
      console.log(`[DISPATCHER] Disparando Lembrete de Contas (${agoraSp})...`);
      try {
        const res = await fetch(`${protocol}://${host}/api/cron/lembretes`);
        const json = await res.json();
        await configRef.update({ ultimoEnvioLembretes: hojeSp });
        resultados.acoesDisparadas.push({ tipo: 'lembretes', sucesso: true, retorno: json });
      } catch (err: any) {
        console.error('[DISPATCHER] Erro ao disparar lembretes:', err);
        resultados.acoesDisparadas.push({ tipo: 'lembretes', sucesso: false, erro: err.message });
      }
    }

    // 2. Checar se é hora do Fechamento Diário
    if (agoraSp === horarioFechamento && ultimoEnvioFechamento !== hojeSp) {
      console.log(`[DISPATCHER] Disparando Fechamento Diário (${agoraSp})...`);
      try {
        const res = await fetch(`${protocol}://${host}/api/cron/fechamento-diario`);
        const json = await res.json();
        await configRef.update({ ultimoEnvioFechamento: hojeSp });
        resultados.acoesDisparadas.push({ tipo: 'fechamento', sucesso: true, retorno: json });
      } catch (err: any) {
        console.error('[DISPATCHER] Erro ao disparar fechamento:', err);
        resultados.acoesDisparadas.push({ tipo: 'fechamento', sucesso: false, erro: err.message });
      }
    }

    return NextResponse.json({
      status: 'ok',
      mensagem: resultados.acoesDisparadas.length > 0 ? 'Ações agendadas executadas' : 'Nenhuma ação necessária no minuto atual',
      ...resultados
    });

  } catch (error: any) {
    console.error('[DISPATCHER] Erro geral:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
