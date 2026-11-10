// Updated monitoramento route with STRICT multi-tenant isolation
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { sendPushNotification } from '@/lib/push';

/**
 * /api/cron/monitoramento
 * Executa para verificar pendências com isolamento estrito entre licenças (tenants).
 * Se o parâmetro ?tenant=X for informado, processa e retorna EXCLUSIVAMENTE a licença solicitada.
 */
export async function GET(request: Request) {
  try {
    const db = adminDb;
    if (!db) {
      return NextResponse.json({ error: 'Firebase Admin Firestore não disponível' }, { status: 500 });
    }

    const url = new URL(request.url);
    const requestedTenant = url.searchParams.get('tenant');

    const now = new Date();
    const hojeSp = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
      .format(now)
      .split('/')
      .reverse()
      .join('-'); // YYYY-MM-DD

    // 1. Obter licenças (tenants)
    const licencasSnap = await db.collection('admin_master_licencas').get();
    let allTenants: { id: string; nome: string; isMaster: boolean }[] = [
      { id: 'master', nome: 'Clovis Master (Pessoal)', isMaster: true }
    ];
    licencasSnap.forEach(doc => {
      const data = doc.data();
      allTenants.push({
        id: doc.id,
        nome: data.nomeFantasia || data.razaoSocial || doc.id,
        isMaster: false
      });
    });

    // ISOLAMENTO MULTI-TENANT: Se o usuário/tela solicitou um tenant específico, filtra SOMENTE ELE!
    let targetTenants = allTenants;
    if (requestedTenant) {
      const found = allTenants.filter(t => t.id === requestedTenant);
      if (found.length > 0) {
        targetTenants = found;
      } else {
        // Se for um tenantId novo ou customizado
        targetTenants = [{
          id: requestedTenant,
          nome: requestedTenant,
          isMaster: requestedTenant === 'master' || requestedTenant === '9yxuafoC0AV9BrIKem05ponbmgn2'
        }];
      }
    }

    const resultados: any[] = [];
    const atuaisAlertIds = new Set<string>();

    for (const tenant of targetTenants) {
      // 2. Buscar transações no caminho correto da licença
      const transacoesPath = tenant.isMaster ? 'transacoes' : `tenants/${tenant.id}/transacoes`;
      
      const docMap = new Map<string, any>();

      // Busca na subcoleção do tenant
      try {
        const snapSub = await db.collection(transacoesPath)
          .where('status', 'in', ['pendente', 'parcial', 'atrasado'])
          .get();
        snapSub.forEach(d => docMap.set(d.id, { id: d.id, ...d.data() }));
      } catch (err) {
        console.warn(`[MONITORAMENTO] Subcoleção ${transacoesPath} não encontrada ou erro:`, err);
      }

      // Se não for master, também verifica caso haja transações na raiz com tenantId
      if (!tenant.isMaster) {
        try {
          const snapRoot = await db.collection('transacoes')
            .where('tenantId', '==', tenant.id)
            .where('status', 'in', ['pendente', 'parcial', 'atrasado'])
            .get();
          snapRoot.forEach(d => docMap.set(d.id, { id: d.id, ...d.data() }));
        } catch (err) {}
      }

      const pendencias: any[] = [];
      docMap.forEach((t, transId) => {
        const vencimento = t.dataVencimento?.toDate?.() || t.dataVencimento || t.data;
        const vencStr = vencimento
          ? (typeof vencimento === 'string' && vencimento.length === 10
              ? vencimento
              : new Intl.DateTimeFormat('pt-BR', {
                  timeZone: 'America/Sao_Paulo',
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit'
                })
                  .format(vencimento instanceof Date ? vencimento : new Date(vencimento))
                  .split('/')
                  .reverse()
                  .join('-'))
          : null;

        // Determinar tipo de alerta
        if (vencStr === hojeSp) {
          pendencias.push({ tipo: 'venceHoje', transacaoId: transId, ...t });
        } else if (vencStr && vencStr < hojeSp) {
          pendencias.push({ tipo: 'vencida', transacaoId: transId, ...t });
        } else if (t.tipo === 'recebimento' && vencStr === hojeSp) {
          pendencias.push({ tipo: 'recebeHoje', transacaoId: transId, ...t });
        }
      });

      // 3. Persistir / atualizar alertas de 60 min no Firestore
      const alertsCol = db.collection('alertas_pendentes');
      for (const p of pendencias) {
        const alertId = `${tenant.id}_${p.transacaoId}`;
        atuaisAlertIds.add(alertId);
        const alertRef = alertsCol.doc(alertId);
        const snap = await alertRef.get();
        if (!snap.exists) {
          await alertRef.set({
            tenantId: tenant.id,
            transacaoId: p.transacaoId,
            nextNotify: now.toISOString(),
            intervalMinutes: 60,
            active: true,
            criadoEm: now.toISOString()
          });
        } else {
          const data = snap.data();
          if (data && data.active) {
            const next = new Date(data.nextNotify);
            if (now >= next) {
              await alertRef.update({
                nextNotify: new Date(now.getTime() + 60 * 60 * 1000).toISOString()
              });
            }
          }
        }
      }

      resultados.push({
        tenant: tenant.id,
        nome: tenant.nome,
        quantidade: pendencias.length,
        pendencias
      });
    }

    // 4. Limpar alertas concluídos (apenas para os tenants processados)
    if (targetTenants.length === 1) {
      const singleTenantId = targetTenants[0].id;
      const tenantAlertsSnap = await db.collection('alertas_pendentes')
        .where('tenantId', '==', singleTenantId)
        .get();
      const batch = db.batch();
      tenantAlertsSnap.docs.forEach(doc => {
        if (!atuaisAlertIds.has(doc.id)) {
          batch.delete(doc.ref);
        }
      });
      await batch.commit();
    } else {
      const allAlertsSnap = await db.collection('alertas_pendentes').get();
      const batch = db.batch();
      allAlertsSnap.docs.forEach(doc => {
        if (!atuaisAlertIds.has(doc.id)) {
          batch.delete(doc.ref);
        }
      });
      await batch.commit();
    }

    return NextResponse.json({
      status: 'ok',
      tenantIsolado: requestedTenant || null,
      horarioSp: new Intl.DateTimeFormat('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }).format(now),
      dataSp: hojeSp,
      resultados
    });
  } catch (error: any) {
    console.error('[MONITORAMENTO] Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
