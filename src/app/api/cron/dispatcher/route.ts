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

    console.log(`[DISPATCHER MULTI-TENANT] Verificando agendamentos. Hora: ${agoraSp} | Data: ${hojeSp}`);

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
      
      const ultimoEnvioLembretes = configData?.ultimoEnvioLembretes;
      const ultimoEnvioFechamento = configData?.ultimoEnvioFechamento;

      licencasProcessadas.push({
        tenant: tenant.id,
        nome: tenant.nome,
        ativo,
        temNumero: !!numero,
        numero,
        horarioLembretes,
        horarioFechamento,
        ultimoEnvioLembretes,
        ultimoEnvioFechamento
      });

      // Pula se desativado ou sem número cadastrado
      if (!ativo || !numero) continue;

      // Disparo de Lembrete Matinal (Contas a Pagar/Receber)
      const flagLembrete = `${hojeSp}_${horarioLembretes}`;
      if (agoraSp === horarioLembretes && ultimoEnvioLembretes !== flagLembrete) {
        console.log(`[DISPATCHER] Disparando Lembrete para ${tenant.nome} (${numero})...`);
        try {
          const url = `${protocol}://${host}/api/cron/lembretes?tenantId=${tenant.id}&numero=${numero}&nome=${encodeURIComponent(tenant.nome)}`;
          const res = await fetch(url);
          const json = await res.json();
          await configRef.set({ ultimoEnvioLembretes: flagLembrete }, { merge: true });
          acoesDisparadas.push({ tipo: 'lembretes', tenant: tenant.id, numero, sucesso: true, retorno: json });
        } catch (err: any) {
          console.error(`[DISPATCHER] Erro ao disparar lembrete para ${tenant.id}:`, err);
          acoesDisparadas.push({ tipo: 'lembretes', tenant: tenant.id, sucesso: false, erro: err.message });
        }
      }

      // Disparo de Fechamento Diário
      const flagFechamento = `${hojeSp}_${horarioFechamento}`;
      if (agoraSp === horarioFechamento && ultimoEnvioFechamento !== flagFechamento) {
        console.log(`[DISPATCHER] Disparando Fechamento Diário para ${tenant.nome} (${numero})...`);
        try {
          const url = `${protocol}://${host}/api/cron/fechamento-diario?tenantId=${tenant.id}&numero=${numero}&nome=${encodeURIComponent(tenant.nome)}`;
          const res = await fetch(url);
          const json = await res.json();
          await configRef.set({ ultimoEnvioFechamento: flagFechamento }, { merge: true });
          acoesDisparadas.push({ tipo: 'fechamento', tenant: tenant.id, numero, sucesso: true, retorno: json });
        } catch (err: any) {
          console.error(`[DISPATCHER] Erro ao disparar fechamento para ${tenant.id}:`, err);
          acoesDisparadas.push({ tipo: 'fechamento', tenant: tenant.id, sucesso: false, erro: err.message });
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
