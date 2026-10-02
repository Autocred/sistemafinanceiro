import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { enviarMensagemWhatsApp } from '@/lib/whatsapp';
import { format, parseISO, isWithinInterval, addDays } from 'date-fns';

export const dynamic = 'force-dynamic';

function isDiaUtil(d: Date) {
  const dia = d.getDay();
  return dia !== 0 && dia !== 6;
}

function calcularDiasUteisEntre(inicio: Date, fim: Date) {
  let cont = 0;
  let atual = new Date(inicio);
  atual.setHours(0, 0, 0, 0);
  const fimD = new Date(fim);
  fimD.setHours(0, 0, 0, 0);
  while (atual <= fimD) {
    if (isDiaUtil(atual)) cont++;
    atual = addDays(atual, 1);
  }
  return cont;
}

function gerarBarraProgresso(pct: number) {
  const totalBlocos = 10;
  const pctSegura = Math.max(0, Math.min(100, pct));
  const blocosCheios = Math.round((pctSegura / 100) * totalBlocos);
  const blocosVazios = totalBlocos - blocosCheios;
  return `[${'█'.repeat(blocosCheios)}${'░'.repeat(blocosVazios)}] ${pct.toFixed(1)}%`;
}

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const paramTenantId = searchParams.get('tenantId');
    const paramNumero = searchParams.get('numero');
    const paramNome = searchParams.get('nome');
    const slot = searchParams.get('slot') || ''; // '12h' ou '18h'

    const configSnap = await adminDb!.collection('configuracoes').doc('geral').get();
    const configData = configSnap.exists ? configSnap.data() : {};

    let telefone = paramNumero || configData?.whatsappNumeros || configData?.whatsappNumeroMaster;
    const apiUrl = configData?.whatsappApiUrl;
    const apiToken = configData?.whatsappApiToken;

    if (!telefone) {
      return NextResponse.json({ success: false, message: 'Nenhum número de WhatsApp configurado para receber o resumo de metas.' });
    }

    const isMaster = !paramTenantId || paramTenantId === 'master' || paramTenantId === '9yxuafoC0AV9BrIKem05ponbmgn2';
    const nomeSistema = paramNome || (isMaster ? (configData?.nomeSistema || 'Clovis Master') : 'Autocred Promotora');

    const metasPath = isMaster ? 'metas_financeiras' : `tenants/${paramTenantId}/metas_financeiras`;
    const transacoesPath = isMaster ? 'transacoes' : `tenants/${paramTenantId}/transacoes`;

    console.log(`[RESUMO METAS] Licença: ${nomeSistema} | Buscando metas em: ${metasPath}`);

    // 1. Buscar metas da licença
    let metasSnap = await adminDb!.collection(metasPath).get();
    let listaMetas: any[] = [];

    if (!metasSnap.empty) {
      listaMetas = metasSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    } else {
      // Fallback para metas V1 caso não use metas_financeiras
      const legacyPath = isMaster ? 'metas' : `tenants/${paramTenantId}/metas`;
      const legacySnap = await adminDb!.collection(legacyPath).get();
      if (!legacySnap.empty) {
        listaMetas = legacySnap.docs.map(d => {
          const dt = d.data();
          return {
            id: d.id,
            nome: dt.nome || 'Meta Financeira',
            valorAlvo: Number(dt.valor) || 0,
            tipo: 'receita',
            dataInicio: dt.criadoEm ? dt.criadoEm.substring(0, 10) : format(new Date(), 'yyyy-MM-01'),
            dataTermino: dt.prazo || format(new Date(), 'yyyy-MM-28'),
            status: dt.ativo !== false ? 'ativa' : 'inativa'
          };
        });
      }
    }

    // Filtrar apenas metas ativas
    const hoje = new Date();
    const hojeStr = format(hoje, 'yyyy-MM-dd');
    const metasAtivas = listaMetas.filter(m => {
      if (m.status && m.status !== 'ativa') return false;
      // Valida se a data de hoje está dentro ou antes do término
      if (m.dataTermino && m.dataTermino < hojeStr) return false;
      return true;
    });

    if (metasAtivas.length === 0) {
      console.log(`[RESUMO METAS] Nenhuma meta ativa encontrada para ${nomeSistema}`);
      return NextResponse.json({ success: false, message: 'Nenhuma meta ativa encontrada no período.' });
    }

    // 2. Buscar transações da licença
    const transacoesSnap = await adminDb!.collection(transacoesPath).get();
    const transacoes = transacoesSnap.docs.map(d => d.data());

    // 3. Calcular progresso para cada meta ativa
    const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const displayData = format(hoje, 'dd/MM/yyyy');
    const saudacaoSlot = slot.includes('12') ? '🕛 *Acompanhamento do Meio-Dia*' : (slot.includes('18') ? '🕕 *Fechamento de Metas do Dia*' : '🎯 *Acompanhamento de Metas*');

    let mensagem = `${saudacaoSlot} - ${displayData}\n`;
    mensagem += `*${nomeSistema}*\n\n`;

    metasAtivas.forEach((meta, idx) => {
      const dInicio = meta.dataInicio ? parseISO(meta.dataInicio) : new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      const dFim = meta.dataTermino ? parseISO(meta.dataTermino) : new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);

      let realizado = 0;
      let realizadoHoje = 0;

      transacoes.forEach(t => {
        if (t.status !== 'pago' && t.status !== 'recebido') return;
        if (meta.tipo && t.tipo !== meta.tipo) return;
        if (meta.categoria && t.categoriaNome !== meta.categoria) return;

        const raw = t.dataPagamento || t.dataVencimento || t.data;
        if (!raw) return;

        try {
          const dtT = parseISO(raw.substring(0, 10));
          if (isWithinInterval(dtT, { start: dInicio, end: dFim })) {
            const val = Math.abs(Number(t.valor) || 0);
            realizado += val;
            if (raw.substring(0, 10) === hojeStr) {
              realizadoHoje += val;
            }
          }
        } catch {}
      });

      const alvo = Number(meta.valorAlvo) || 0;
      const pct = alvo > 0 ? (realizado / alvo) * 100 : 0;
      const falta = Math.max(0, alvo - realizado);

      const diasUteisTotal = calcularDiasUteisEntre(dInicio, dFim);
      const diasUteisDecorridos = calcularDiasUteisEntre(dInicio, hoje);
      const diasUteisRestantes = Math.max(0, diasUteisTotal - diasUteisDecorridos);

      const metaDiariaBase = diasUteisTotal > 0 ? alvo / diasUteisTotal : 0;
      const idealAcumulado = metaDiariaBase * diasUteisDecorridos;
      const avancoVsIdeal = realizado - idealAcumulado;

      // Comparação do Dia de Hoje
      const diffHoje = realizadoHoje - metaDiariaBase;
      const statusHoje = diffHoje >= 0
        ? `🟢 ${fmt(realizadoHoje)} (${fmt(Math.abs(diffHoje))} ACIMA da meta do dia! 🚀)`
        : `🔴 ${fmt(realizadoHoje)} (${fmt(Math.abs(diffHoje))} ABAIXO da meta do dia)`;

      // Comparação do Mês Acumulado
      const statusMes = avancoVsIdeal >= 0
        ? `🟢 ${fmt(Math.abs(avancoVsIdeal))} ACIMA do esperado até hoje`
        : `🔴 ${fmt(Math.abs(avancoVsIdeal))} ABAIXO do esperado até hoje`;

      const metaDiariaRestante = diasUteisRestantes > 0 ? falta / diasUteisRestantes : 0;
      const barra = gerarBarraProgresso(pct);

      let statusRitmo = '🚀 No Ritmo!';
      if (pct >= 100) statusRitmo = '🎉 META CONCLUÍDA! Parabéns!';
      else if (pct < 30 && diasUteisRestantes < 10) statusRitmo = '⚠️ Atenção / Acelerar!';
      else if (pct >= 80) statusRitmo = '🔥 Reta Final! Quase lá!';

      const iconeTipo = meta.tipo === 'despesa' ? '📉' : '🏁';
      mensagem += `${iconeTipo} *Meta: ${meta.nome}*\n`;
      mensagem += `• 🎯 *Alvo do Mês:* ${fmt(alvo)}\n`;
      mensagem += `• 🟢 *Total Realizado:* ${fmt(realizado)} (${pct.toFixed(1)}%)\n`;
      mensagem += `• ⏳ *Restante:* ${fmt(falta)}\n`;
      mensagem += `• 📅 *Dias Úteis:* ${diasUteisDecorridos} decorridos / ${diasUteisRestantes} restantes\n\n`;

      mensagem += `⚡ *Desempenho da Meta Diária:*\n`;
      mensagem += `• 🎯 *Meta Diária:* ${fmt(metaDiariaBase)} / dia útil\n`;
      mensagem += `• 💵 *Alcançado Hoje:* ${statusHoje}\n`;
      mensagem += `• 📊 *Ritmo no Mês:* ${statusMes}\n`;
      if (diasUteisRestantes > 0 && falta > 0) {
        mensagem += `• 🚀 *Necessário p/ os Próximos Dias:* ${fmt(metaDiariaRestante)} / dia útil\n`;
      }
      mensagem += `• 📈 *Progresso:* ${barra}\n`;
      mensagem += `• 🧭 *Status Geral:* ${statusRitmo}\n`;

      if (idx < metasAtivas.length - 1) {
        mensagem += `\n─────────────────────\n\n`;
      }
    });

    mensagem += `\n💡 _"O sucesso é o somatório de pequenos esforços repetidos diariamente."_\n`;
    mensagem += `\n_Gerado automaticamente por ${nomeSistema}_`;

    // 4. Enviar via Evolution API
    await enviarMensagemWhatsApp(telefone, mensagem, apiUrl, apiToken);

    return NextResponse.json({
      success: true,
      message: 'Resumo de metas enviado com sucesso!',
      metasProcessadas: metasAtivas.length,
      resumo: mensagem
    });

  } catch (error: any) {
    console.error('Erro no cron resumo de metas:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
