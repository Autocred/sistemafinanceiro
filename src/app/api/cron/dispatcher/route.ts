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

    const diaDoMesSp = Number(hojeSp.split('-')[2]);
    const mesAtualSp = hojeSp.substring(0, 7);

    // Dia da semana em São Paulo: 0 = Domingo, 1 = Segunda, ..., 6 = Sábado
    const diaSemanaSp = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" })).getDay().toString();

    // Suporte a ?force=true para testes manuais (ignora check de horário)
    const urlParams = new URL(request.url);
    const forceAll = urlParams.searchParams.get('force') === 'true';
    const forceTipo = urlParams.searchParams.get('tipo'); // lembretes, fechamento, metas1, metas2

    console.log(`[DISPATCHER MULTI-TENANT] Hora: ${agoraSp} | Data: ${hojeSp} | Dia: ${diaDoMesSp} | Force: ${forceAll} | Tipo: ${forceTipo || 'auto'}`);

    const host = request.headers.get('host') || 'sistemafinanceiropessoal.vercel.app';
    const protocol = host.includes('localhost') ? 'http' : 'https';

    const acoesDisparadas: any[] = [];
    const licencasProcessadas: any[] = [];

    // 1. Obter todas as licenças cadastradas no sistema
    const licencasSnap = await db.collection('admin_master_licencas').get();
    
    const listaTenants: { id: string; nome: string; isMaster: boolean }[] = [
      { id: 'master', nome: 'Clovis Master (Pessoal)', isMaster: true }
    ];

    licencasSnap.forEach(doc => {
      const data = doc.data();
      listaTenants.push({
        id: doc.id,
        nome: data.nomeFantasia || data.razaoSocial || doc.id,
        isMaster: false
      });
    });

    // 2. Processar cada licença individualmente
    for (const tenant of listaTenants) {
      let configRef;
      let configData: any = {};

      if (tenant.isMaster) {
        configRef = db.collection('configuracoes').doc('geral');
        const snap = await configRef.get();
        configData = snap.exists ? snap.data() : {};

        // Também ler config/geral (onde o app do Clovis Master salva na tela de Configurações)
        const snapConfig = await db.collection('config').doc('geral').get();
        if (snapConfig.exists) {
          const cData = snapConfig.data() || {};
          configData = {
            ...configData,
            ...cData,
            whatsappAtivo: cData.whatsappAtivo !== undefined ? cData.whatsappAtivo : configData.whatsappAtivo,
            whatsappNumeros: cData.whatsappNumeros || configData.whatsappNumeros || configData.whatsappNumeroMaster,
            whatsappHorarioFechamento: cData.whatsappHorarioFechamento || configData.whatsappHorarioFechamento || cData.whatsappHorario || configData.whatsappHorario,
            whatsappHorarioLembretes: cData.whatsappHorarioLembretes || configData.whatsappHorarioLembretes
          };
        }
      } else {
        // Tenta ler a config da licença do cliente
        configRef = db.collection(`tenants/${tenant.id}/config`).doc('geral');
        let snap = await configRef.get();
        
        if (!snap.exists) {
          // Fallback para config raiz caso seja a autocred que ainda compartilha configuracoes/geral
          if (tenant.id === 'autocred-promotora-de-credito') {
            configRef = db.collection('configuracoes').doc('geral');
            snap = await configRef.get();
          }
        }
        configData = snap.exists ? snap.data() : {};
      }

      const ativo = configData?.whatsappAtivo !== false;
      const numero = configData?.whatsappNumeros || configData?.whatsappNumeroMaster || configData?.telefoneWhatsApp;
      const diasPermitidos = configData?.whatsappDias || configData?.pushDias;
      const diaPermitido = !diasPermitidos || !Array.isArray(diasPermitidos) || diasPermitidos.length === 0 || diasPermitidos.includes(diaSemanaSp);
      const horarioLembretes = configData?.whatsappHorarioLembretes || '08:00';
      const horarioFechamento = configData?.whatsappHorarioFechamento || configData?.whatsappHorario || '17:00';
      
      const metasAtivo = configData?.whatsappMetasAtivo !== false;
      const horarioMetas1 = configData?.whatsappHorarioMetas1 || '12:00';
      const horarioMetas2 = configData?.whatsappHorarioMetas2 || '18:00';

      const fechamentoMensalAtivo = configData?.whatsappFechamentoMensalAtivo !== false;
      const diaFechamentoMensal = Number(configData?.whatsappDiaFechamentoMensal) || 1;
      const horarioFechamentoMensal = configData?.whatsappHorarioFechamentoMensal || '09:00';
      
      const ultimoEnvioLembretes = configData?.ultimoEnvioLembretes;
      const ultimoEnvioFechamento = configData?.ultimoEnvioFechamento;
      const ultimoEnvioMetas1 = configData?.ultimoEnvioMetas1;
      const ultimoEnvioMetas2 = configData?.ultimoEnvioMetas2;
      const ultimoEnvioFechamentoMensal = configData?.ultimoEnvioFechamentoMensal;

      licencasProcessadas.push({
        tenant: tenant.id,
        nome: tenant.nome,
        ativo,
        temNumero: !!numero,
        numero,
        horarioLembretes,
        horarioFechamento,
        horarioMetas1,
        horarioMetas2,
        metasAtivo,
        fechamentoMensalAtivo,
        diaFechamentoMensal,
        horarioFechamentoMensal,
        ultimoEnvioLembretes,
        ultimoEnvioFechamento,
        ultimoEnvioMetas1,
        ultimoEnvioMetas2,
        ultimoEnvioFechamentoMensal
      });

      // Pula se desativado ou sem número cadastrado
      if (!ativo || !numero) continue;

      // Helper: salvar flag de último envio
      const salvarFlag = async (campo: string, valor: string) => {
        if (tenant.isMaster) {
          await db.collection('configuracoes').doc('geral').set({ [campo]: valor }, { merge: true });
          await db.collection('config').doc('geral').set({ [campo]: valor }, { merge: true });
        } else {
          await configRef.set({ [campo]: valor }, { merge: true });
        }
      };

      // Helper para checar se o horário programado já foi alcançado
      const atingiuHorario = (hConfig: string) => {
        if (!hConfig) return false;
        return agoraSp >= hConfig;
      };

      // ─── LEMBRETE MATINAL (Contas a Pagar/Receber) ───
      const deveEnviarLembrete = (forceAll || forceTipo === 'lembretes' || (diaPermitido && atingiuHorario(horarioLembretes))) && ultimoEnvioLembretes !== hojeSp;
      if (deveEnviarLembrete) {
        console.log(`[DISPATCHER] ✅ Disparando Lembrete para ${tenant.nome} (${numero}) | Horário config: ${horarioLembretes} | Hora atual: ${agoraSp}`);
        try {
          const url = `${protocol}://${host}/api/cron/lembretes?tenantId=${tenant.id}&numero=${numero}&nome=${encodeURIComponent(tenant.nome)}`;
          const res = await fetch(url);
          const json = await res.json();
          if (json && json.success !== false) {
            await salvarFlag('ultimoEnvioLembretes', hojeSp);
          }
          acoesDisparadas.push({ tipo: 'lembretes', tenant: tenant.id, numero, horarioConfig: horarioLembretes, sucesso: true, retorno: json });
        } catch (err: any) {
          console.error(`[DISPATCHER] ❌ Erro lembrete ${tenant.id}:`, err);
          acoesDisparadas.push({ tipo: 'lembretes', tenant: tenant.id, sucesso: false, erro: err.message });
        }
      }

      // ─── METAS - HORÁRIO 1 (Meio-Dia) ───
      const deveEnviarMetas1 = metasAtivo && (forceAll || forceTipo === 'metas1' || (diaPermitido && atingiuHorario(horarioMetas1))) && ultimoEnvioMetas1 !== hojeSp;
      if (deveEnviarMetas1) {
        console.log(`[DISPATCHER] ✅ Disparando Metas 1 para ${tenant.nome} (${numero}) | Horário config: ${horarioMetas1} | Hora atual: ${agoraSp}`);
        try {
          const url = `${protocol}://${host}/api/cron/resumo-metas?tenantId=${tenant.id}&numero=${numero}&nome=${encodeURIComponent(tenant.nome)}&slot=12h`;
          const res = await fetch(url);
          const json = await res.json();
          if (json && json.success !== false) {
            await salvarFlag('ultimoEnvioMetas1', hojeSp);
          }
          acoesDisparadas.push({ tipo: 'metas_1', tenant: tenant.id, numero, horarioConfig: horarioMetas1, sucesso: true, retorno: json });
        } catch (err: any) {
          console.error(`[DISPATCHER] ❌ Erro metas 1 ${tenant.id}:`, err);
          acoesDisparadas.push({ tipo: 'metas_1', tenant: tenant.id, sucesso: false, erro: err.message });
        }
      }

      // ─── FECHAMENTO DIÁRIO ───
      const deveEnviarFechamento = (forceAll || forceTipo === 'fechamento' || (diaPermitido && atingiuHorario(horarioFechamento))) && ultimoEnvioFechamento !== hojeSp;
      if (deveEnviarFechamento) {
        console.log(`[DISPATCHER] ✅ Disparando Fechamento para ${tenant.nome} (${numero}) | Horário config: ${horarioFechamento} | Hora atual: ${agoraSp}`);
        try {
          const url = `${protocol}://${host}/api/cron/fechamento-diario?tenantId=${tenant.id}&numero=${numero}&nome=${encodeURIComponent(tenant.nome)}`;
          const res = await fetch(url);
          const json = await res.json();
          if (json && json.success !== false) {
            await salvarFlag('ultimoEnvioFechamento', hojeSp);
          }
          acoesDisparadas.push({ tipo: 'fechamento', tenant: tenant.id, numero, horarioConfig: horarioFechamento, sucesso: true, retorno: json });
        } catch (err: any) {
          console.error(`[DISPATCHER] ❌ Erro fechamento ${tenant.id}:`, err);
          acoesDisparadas.push({ tipo: 'fechamento', tenant: tenant.id, sucesso: false, erro: err.message });
        }
      }

      // ─── METAS - HORÁRIO 2 (Fechamento do Expediente) ───
      const deveEnviarMetas2 = metasAtivo && (forceAll || forceTipo === 'metas2' || (diaPermitido && atingiuHorario(horarioMetas2))) && ultimoEnvioMetas2 !== hojeSp;
      if (deveEnviarMetas2) {
        console.log(`[DISPATCHER] ✅ Disparando Metas 2 para ${tenant.nome} (${numero}) | Horário config: ${horarioMetas2} | Hora atual: ${agoraSp}`);
        try {
          const url = `${protocol}://${host}/api/cron/resumo-metas?tenantId=${tenant.id}&numero=${numero}&nome=${encodeURIComponent(tenant.nome)}&slot=18h`;
          const res = await fetch(url);
          const json = await res.json();
          await salvarFlag('ultimoEnvioMetas2', hojeSp);
          acoesDisparadas.push({ tipo: 'metas_2', tenant: tenant.id, numero, horarioConfig: horarioMetas2, sucesso: true, retorno: json });
        } catch (err: any) {
          console.error(`[DISPATCHER] ❌ Erro metas 2 ${tenant.id}:`, err);
          acoesDisparadas.push({ tipo: 'metas_2', tenant: tenant.id, sucesso: false, erro: err.message });
        }
      }

      // ─── FECHAMENTO MENSAL EXECUTIVO ───
      const deveEnviarMensal = fechamentoMensalAtivo && diaDoMesSp === diaFechamentoMensal && ultimoEnvioFechamentoMensal !== mesAtualSp &&
        (forceAll || forceTipo === 'mensal' || atingiuHorario(horarioFechamentoMensal));
      if (deveEnviarMensal) {
        console.log(`[DISPATCHER] ✅ Disparando Fechamento Mensal para ${tenant.nome} (${numero}) | Horário config: ${horarioFechamentoMensal} | Hora atual: ${agoraSp}`);
        try {
          const url = `${protocol}://${host}/api/cron/fechamento-mensal?tenantId=${tenant.id}&numero=${numero}&nome=${encodeURIComponent(tenant.nome)}`;
          const res = await fetch(url);
          const json = await res.json();
          if (json && json.success !== false) {
            await salvarFlag('ultimoEnvioFechamentoMensal', mesAtualSp);
          }
          acoesDisparadas.push({ tipo: 'fechamento_mensal', tenant: tenant.id, numero, horarioConfig: horarioFechamentoMensal, sucesso: true, retorno: json });
        } catch (err: any) {
          console.error(`[DISPATCHER] ❌ Erro fechamento mensal ${tenant.id}:`, err);
          acoesDisparadas.push({ tipo: 'fechamento_mensal', tenant: tenant.id, sucesso: false, erro: err.message });
        }
      }
    }

    return NextResponse.json({
      status: 'ok',
      mensagem: acoesDisparadas.length > 0 ? `${acoesDisparadas.length} mensagens enviadas` : 'Nenhuma ação necessária no minuto atual',
      horaAtual: agoraSp,
      dataAtual: hojeSp,
      forceAll,
      forceTipo: forceTipo || null,
      totalLicencasVerificadas: listaTenants.length,
      licencas: licencasProcessadas,
      acoesDisparadas
    });

  } catch (error: any) {
    console.error('[DISPATCHER] Erro geral:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
