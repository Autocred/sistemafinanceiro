export const maxDuration = 60;
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function GET(request: Request) {
  try {
    const db = adminDb!;
    const urlParams = new URL(request.url);
    const rotina = urlParams.searchParams.get('rotina');
    
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

    console.log(`[DISPATCHER MULTI-TENANT] Verificando agendamentos. Hora: ${agoraSp} | Data: ${hojeSp} (Dia: ${diaDoMesSp})`);

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

      // Disparo de Lembrete Matinal (Contas a Pagar/Receber)
      const flagLembrete = `${hojeSp}_${horarioLembretes}`;
      if (rotina === 'manha' || (agoraSp === horarioLembretes && ultimoEnvioLembretes !== flagLembrete)) {
        if (rotina || ultimoEnvioLembretes !== hojeSp) {
          console.log(`[DISPATCHER] Disparando Lembrete para ${tenant.nome} (${numero})...`);
          try {
            const url = `${protocol}://${host}/api/cron/lembretes?tenantId=${tenant.id}&numero=${numero}&nome=${encodeURIComponent(tenant.nome)}`;
            const res = await fetch(url);
            const json = await res.json();
            if (tenant.isMaster) {
              await db.collection('configuracoes').doc('geral').set({ ultimoEnvioLembretes: hojeSp }, { merge: true });
              await db.collection('config').doc('geral').set({ ultimoEnvioLembretes: hojeSp }, { merge: true });
            } else {
              await configRef.set({ ultimoEnvioLembretes: hojeSp }, { merge: true });
            }
            acoesDisparadas.push({ tipo: 'lembretes', tenant: tenant.id, numero, sucesso: true, retorno: json });
          } catch (err: any) {
            console.error(`[DISPATCHER] Erro ao disparar lembrete para ${tenant.id}:`, err);
            acoesDisparadas.push({ tipo: 'lembretes', tenant: tenant.id, sucesso: false, erro: err.message });
          }
        }
      }

      // Disparo de Metas - Horário 1 (Manhã/Meio-Dia)
      const flagMetas1 = `${hojeSp}_${horarioMetas1}`;
      if (metasAtivo && (rotina === 'manha' || (agoraSp === horarioMetas1 && ultimoEnvioMetas1 !== flagMetas1))) {
        if (rotina || ultimoEnvioMetas1 !== hojeSp) {
          console.log(`[DISPATCHER] Disparando Resumo de Metas 1 para ${tenant.nome} (${numero})...`);
          try {
            const url = `${protocol}://${host}/api/cron/resumo-metas?tenantId=${tenant.id}&numero=${numero}&nome=${encodeURIComponent(tenant.nome)}&slot=12h`;
            const res = await fetch(url);
            const json = await res.json();
            if (tenant.isMaster) {
              await db.collection('configuracoes').doc('geral').set({ ultimoEnvioMetas1: hojeSp }, { merge: true });
              await db.collection('config').doc('geral').set({ ultimoEnvioMetas1: hojeSp }, { merge: true });
            } else {
              await configRef.set({ ultimoEnvioMetas1: hojeSp }, { merge: true });
            }
            acoesDisparadas.push({ tipo: 'metas_1', tenant: tenant.id, numero, sucesso: true, retorno: json });
          } catch (err: any) {
            console.error(`[DISPATCHER] Erro ao disparar metas 1 para ${tenant.id}:`, err);
            acoesDisparadas.push({ tipo: 'metas_1', tenant: tenant.id, sucesso: false, erro: err.message });
          }
        }
      }

      // Disparo de Fechamento Diário (Noite)
      const flagFechamento = `${hojeSp}_${horarioFechamento}`;
      if (rotina === 'noite' || (agoraSp === horarioFechamento && ultimoEnvioFechamento !== flagFechamento)) {
        if (rotina || ultimoEnvioFechamento !== hojeSp) {
          console.log(`[DISPATCHER] Disparando Fechamento Diário para ${tenant.nome} (${numero})...`);
          try {
            const url = `${protocol}://${host}/api/cron/fechamento-diario?tenantId=${tenant.id}&numero=${numero}&nome=${encodeURIComponent(tenant.nome)}`;
            const res = await fetch(url);
            const json = await res.json();
            if (tenant.isMaster) {
              await db.collection('configuracoes').doc('geral').set({ ultimoEnvioFechamento: hojeSp }, { merge: true });
              await db.collection('config').doc('geral').set({ ultimoEnvioFechamento: hojeSp }, { merge: true });
            } else {
              await configRef.set({ ultimoEnvioFechamento: hojeSp }, { merge: true });
            }
            acoesDisparadas.push({ tipo: 'fechamento', tenant: tenant.id, numero, sucesso: true, retorno: json });
          } catch (err: any) {
            console.error(`[DISPATCHER] Erro ao disparar fechamento para ${tenant.id}:`, err);
            acoesDisparadas.push({ tipo: 'fechamento', tenant: tenant.id, sucesso: false, erro: err.message });
          }
        }
      }

      // Disparo de Metas - Horário 2 (Noite)
      const flagMetas2 = `${hojeSp}_${horarioMetas2}`;
      if (metasAtivo && (rotina === 'noite' || (agoraSp === horarioMetas2 && ultimoEnvioMetas2 !== flagMetas2))) {
        if (rotina || ultimoEnvioMetas2 !== hojeSp) {
          console.log(`[DISPATCHER] Disparando Resumo de Metas 2 para ${tenant.nome} (${numero})...`);
          try {
            const url = `${protocol}://${host}/api/cron/resumo-metas?tenantId=${tenant.id}&numero=${numero}&nome=${encodeURIComponent(tenant.nome)}&slot=18h`;
            const res = await fetch(url);
            const json = await res.json();
            if (tenant.isMaster) {
              await db.collection('configuracoes').doc('geral').set({ ultimoEnvioMetas2: hojeSp }, { merge: true });
              await db.collection('config').doc('geral').set({ ultimoEnvioMetas2: hojeSp }, { merge: true });
            } else {
              await configRef.set({ ultimoEnvioMetas2: hojeSp }, { merge: true });
            }
            acoesDisparadas.push({ tipo: 'metas_2', tenant: tenant.id, numero, sucesso: true, retorno: json });
          } catch (err: any) {
            console.error(`[DISPATCHER] Erro ao disparar metas 2 para ${tenant.id}:`, err);
            acoesDisparadas.push({ tipo: 'metas_2', tenant: tenant.id, sucesso: false, erro: err.message });
          }
        }
      }

      // Disparo de Fechamento Mensal Executivo
      if (fechamentoMensalAtivo && diaDoMesSp === diaFechamentoMensal && ultimoEnvioFechamentoMensal !== mesAtualSp) {
        if (rotina === 'noite' || (agoraSp === horarioFechamentoMensal)) {
          console.log(`[DISPATCHER] Disparando Fechamento Mensal Executivo para ${tenant.nome} (${numero})...`);
          try {
            const url = `${protocol}://${host}/api/cron/fechamento-mensal?tenantId=${tenant.id}&numero=${numero}&nome=${encodeURIComponent(tenant.nome)}`;
            const res = await fetch(url);
            const json = await res.json();
            if (tenant.isMaster) {
              await db.collection('configuracoes').doc('geral').set({ ultimoEnvioFechamentoMensal: mesAtualSp }, { merge: true });
              await db.collection('config').doc('geral').set({ ultimoEnvioFechamentoMensal: mesAtualSp }, { merge: true });
            } else {
              await configRef.set({ ultimoEnvioFechamentoMensal: mesAtualSp }, { merge: true });
            }
            acoesDisparadas.push({ tipo: 'fechamento_mensal', tenant: tenant.id, numero, sucesso: true, retorno: json });
          } catch (err: any) {
            console.error(`[DISPATCHER] Erro ao disparar fechamento mensal para ${tenant.id}:`, err);
            acoesDisparadas.push({ tipo: 'fechamento_mensal', tenant: tenant.id, sucesso: false, erro: err.message });
          }
        }
      }
    }

    return NextResponse.json({
      status: 'ok',
      mensagem: acoesDisparadas.length > 0 ? `${acoesDisparadas.length} mensagens enviadas` : 'Nenhuma ação necessária no minuto atual',
      horaAtual: agoraSp,
      dataAtual: hojeSp,
      totalLicencasVerificadas: listaTenants.length,
      licencas: licencasProcessadas,
      acoesDisparadas
    });

  } catch (error: any) {
    console.error('[DISPATCHER] Erro geral:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
