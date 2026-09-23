import { NextResponse } from 'next/server';
import { getFirebaseApp, getDb } from '@/lib/firebase';
import { collection, query, getDocs, doc, addDoc } from 'firebase/firestore';
import { enviarMensagemWhatsApp } from '@/lib/whatsapp';
import { ConfiguracaoApp, Transacao } from '@/lib/types';
import webpush from 'web-push';

webpush.setVapidDetails('mailto:suporte@finance.app', 'BNIPGpo2FSX_novxEx4lSAJa397ugkht4aYZBFacXeiorCbWQa0VDBa2rBzYgqaNe1BtQd_n-mT2Gu302TpN6Z0', 'jgyG0uo3gBItjKgY-Df6zKtCxHjkgITvWrMao8zXVL8');

// Opcional: Proteger a rota do CRON (Vercel manda header x-vercel-cron)
// https://vercel.com/docs/cron-jobs/manage-cron-jobs#securing-cron-jobs
const CRON_SECRET = process.env.CRON_SECRET || 'dev_secret_financeai';

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    // Para teste local, ignãora verificação se não passar Authorization
    if (authHeader && authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    console.log('[CRON] Iniciando rotina de Lembretes e Automações...');

    const db = getDb();
    const usersSnap = await getDocs(collection(db, 'users'));
    
    let processados = 0;
    let enviosZap = 0;
    let enviosPush = 0;
    
    const feriadosNacionais = ['01-01', '04-21', '05-01', '09-07', '10-12', '11-02', '11-15', '12-25'];
    const checkFimDeSemanaOuFeriado = (dataStr: string) => {
      const date = new Date(dataStr + 'T12:00:00Z');
      const day = date.getUTCDay();
      const md = dataStr.substring(5);
      if (day === 0 || day === 6) return 'Fim de Semana';
      if (feriadosNacionais.includes(md)) return 'Feriado';
      return false;
    };

    const hojeData = new Date();
    const hojeStr = hojeData.toISOString().split('T')[0];

    for (const userDoc of usersSnap.docs) {
      const userId = userDoc.id;
      
      // Busca configurações
      const confSnap = await getDocs(collection(db, 'users', userId, 'configuracoes'));
      let cfg: ConfiguracaoApp | null = null;
      if (!confSnap.empty) {
        cfg = confSnap.docs[0].data() as ConfiguracaoApp;
      }
      
      if (!cfg) continue;
      if (!cfg.whatsappAtivo && !cfg.webPushSubscription) continue;
      
      const hojeDiaSemana = new Date().getDay().toString(); // 0 a 6 (Dom a Sab)
      if (cfg.pushDias && cfg.pushDias.length > 0 && !cfg.pushDias.includes(hojeDiaSemana)) {
          continue; // Usuário optou por não receber alertas neste dia da semana
      }
      
      processados++;

      // Busca despesas pendentes
      const transQ = query(collection(db, 'users', userId, 'transacoes'));
      const transSnap = await getDocs(transQ);
      
      const transacoes = transSnap.docs.map(d => ({ id: d.id, ...d.data() } as Transacao));
      
      const despesasPendentes = transacoes.filter(t => 
        t.tipo === 'despesa' && 
        (t.status === 'pendente' || t.status === 'atrasado') &&
        t.formaPagamento !== 'cartao_credito' // faturas trataremos depois
      );
      
      const faturasPendentes = transacoes.filter(t => 
        t.tipo === 'despesa' && 
        t.formaPagamento === 'cartao_credito' // simplificação para este cron
      );
      
      // Contas de Hoje
      const venceHoje = despesasPendentes.filter(t => t.dataVencimento === hojeStr || t.data === hojeStr);
      const atrasadas = despesasPendentes.filter(t => (t.dataVencimento || t.data) < hojeStr);
      
            const proximosGeral = despesasPendentes.filter(t => {
        const d = t.dataVencimento || t.data;
        if (d <= hojeStr) return false;
        const diff = Math.ceil((new Date(d).getTime() - hojeData.getTime()) / (1000 * 3600 * 24));
        return diff <= 7;
      });

      const alertasAntecipados: (any & { motivo: string })[] = [];
      const proximos: any[] = [];

      proximosGeral.forEach(t => {
        const d = t.dataVencimento || t.data;
        const motivo = checkFimDeSemanaOuFeriado(d);
        const diff = Math.ceil((new Date(d).getTime() - hojeData.getTime()) / (1000 * 3600 * 24));
        
        if (motivo && diff <= 3) {
          alertasAntecipados.push({ ...t, motivo });
        } else {
          proximos.push(t);
        }
      });

      if (venceHoje.length === 0 && atrasadas.length === 0 && proximos.length === 0) {
        continue; // Tudo em dia, não envia nada para não incomodar
      }

      const fmt = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
      
      let texto = `*FinanceAI - Bom dia, ${cfg.nomeUsuario || 'Usuário'}!* ☀️\n\n`;
      texto += `Aqui está o seu resumo financeiro de hoje:\n\n`;
      
      if (alertasAntecipados.length > 0) {
        texto += `⚠️ *ANTECIPE (Fim de Semana/Feriado):*\n`;
        alertasAntecipados.forEach(t => {
          texto += `- ${t.descricao}: ${fmt(t.valor)} (Vence ${t.dataVencimento ? t.dataVencimento.split('-').reverse().join('/') : t.data.split('-').reverse().join('/')} - ${t.motivo})\n`;
        });
        texto += `\n`;
      }
      
      if (venceHoje.length > 0) {
        texto += `🔴 *VENCEM HOJE:*\n`;
        venceHoje.forEach(t => {
          texto += `- ${t.descricao}: ${fmt(t.valor)}\n`;
        });
        texto += `\n`;
      }
      
      if (atrasadas.length > 0) {
        texto += `⚠️ *ATRASADAS:*\n`;
        atrasadas.forEach(t => {
          texto += `- ${t.descricao}: ${fmt(t.valor)} (Venc: ${t.data.split('-').reverse().join('/')})\n`;
        });
        texto += `\n`;
      }
      
      if (proximos.length > 0) {
        texto += `🟡 *PRÓXIMOS 7 DIAS:*\n`;
        proximos.forEach(t => {
          texto += `- ${t.descricao}: ${fmt(t.valor)} (Venc: ${t.data.split('-').reverse().join('/')})\n`;
        });
        texto += `\n`;
      }
      
      texto += `_Lembre-se de acessar o sistema para marcar como pago após a liquidação!_`;

      const numeros = cfg.whatsappNumeros ? cfg.whatsappNumeros.split(',').map(n => n.trim()).filter(n => n) : [];
      
      for (const numero of numeros) {
        const resultado = await enviarMensagemWhatsApp(numero, texto);
        if (resultado.sucesso) enviosZap++;
        
        
      // Dispara Web Push
      if (cfg.webPushSubscription) {
        try {
          const sub = JSON.parse(cfg.webPushSubscription);
          const payload = JSON.stringify({
            title: `Resumo: ${venceHoje.length} hoje, ${alertasAntecipados.length} antecipar`,
            body: `Hoje: ${venceHoje.length}, Antecipar: ${alertasAntecipados.length}, Atrasadas: ${atrasadas.length}.`,
            url: '/master/financeiro'
          });
          await webpush.sendNotification(sub, payload);
          enviosPush++;
          console.log('[CRON] Web Push enviado com sucesso para', userId);
        } catch (err) {
          console.error('[CRON] Erro ao enviar Web Push para', userId, err);
        }
      }

      // Gera NotificacaoApp não Firebase também (Sinão)
        if (cfg.lembretesSinao !== false && (venceHoje.length > 0 || atrasadas.length > 0)) {
          await addDoc(collection(db, 'users', userId, 'notificacoes'), {
            tipo: atrasadas.length > 0 ? 'atraso' : 'vencimento',
            titulo: 'Resumo Diário de Contas',
            mensagem: `Hoje: ${venceHoje.length} contas, ${alertasAntecipados.length} p/ antecipar e ${atrasadas.length} atrasadas.`,
            data: hojeStr,
            hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            prioridade: atrasadas.length > 0 ? 'urgente' : 'alta',
            lida: false,
            criadoEm: new Date().toISOString()
          });
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'CRON executado com sucesso',
      usuariosProcessados: processados,
      disparosWhatsapp: enviosZap,
      disparosWebPush: enviosPush
    });
    
  } catch (error) {
    console.error('[CRON] Erro:', error);
    return NextResponse.json({ error: 'Erro ao executar rotina' }, { status: 500 });
  }
}
