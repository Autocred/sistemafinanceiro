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

    // Garantir data no fuso de São Paulo (evita que a partir das 21h use o dia seguinte do UTC)
    const hojeStr = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date()).split('/').reverse().join('-'); // YYYY-MM-DD
    const displayData = hojeStr.split('-').reverse().join('/');

    // Precisamos percorrer todos os tenants para mandar extrato pros respectivos donos
    // Mas para simplificar (já que estamos usando muito o tenant Master), vamos buscar do master
    // Ou podemos buscar usuários que tenham um celular configurado em "configuracoes".
    
    // Como o firebase-admin tem acesso total, vamos pegar do tenant master primeiro
    // Idealmente você teria uma lista de contatos na config.
    
    // Buscar config global para pegar o celular do master
    const configSnap = await adminDb!.collection('configuracoes').doc('geral').get();
    
    
    

    // Suporte a chamada parametrizada por licença (Multi-tenant SaaS)
    const { searchParams } = new URL(request.url);
    const paramTenantId = searchParams.get('tenantId');
    const paramNumero = searchParams.get('numero');
    const paramNome = searchParams.get('nome');

    let telefoneMaster = paramNumero || (configSnap.exists ? (configSnap.data()?.telefoneWhatsApp || configSnap.data()?.whatsappNumeroMaster) : process.env.WHATSAPP_NUMERO_MASTER);
    const apiUrl = configSnap.exists ? configSnap.data()?.whatsappApiUrl : undefined;
    const apiToken = configSnap.exists ? configSnap.data()?.whatsappApiToken : undefined;
    
    // tenantId passado por parâmetro ou fallback
    const tenantId = paramTenantId || undefined;

    if (!telefoneMaster) {
      telefoneMaster = '5511999999999'; // Fallback / evitar erro se não tiver configurado ainda
      console.log('Telefone do Master não configurado. Usando mock.');
    }

    // Definir caminho da coleção baseado no tenantId configurado
    // Se tenantId for master ou vazio, usa raiz. Caso contrário usa tenants/{id}/transacoes
    const isMasterTenant = !tenantId || tenantId === 'master' || tenantId === '9yxuafoC0AV9BrIKem05ponbmgn2';
    const transacoesPath = isMasterTenant ? 'transacoes' : `tenants/${tenantId}/transacoes`;
    const nomeSistema = paramNome || (isMasterTenant ? (configSnap.data()?.nomeSistema || 'Clovis Master') : 'Autocred Promotora');
    console.log(`[FECHAMENTO] Licença: ${nomeSistema} | Buscando transações em: ${transacoesPath}`);

    // Buscar transações pagas ou recebidas do tenant
    const transacoesSnap = await adminDb!.collection(transacoesPath)
      .where('status', 'in', ['pago', 'recebido'])
      .get();

    let totalReceitas = 0;
    let totalDespesas = 0;
    const principais: any[] = [];

    transacoesSnap.forEach(doc => {
      const t = doc.data();
      const dtPag = (t.dataPagamento || '').split('T')[0];
      const dtData = (t.data || '').split('T')[0];
      
      // Considera transações pagas/recebidas hoje (pela dataPagamento ou pela data)
      if (dtPag === hojeStr || (!dtPag && dtData === hojeStr)) {
        const val = Number(t.valor) || 0;
        if (t.tipo === 'receita') {
          totalReceitas += val;
        } else {
          totalDespesas += val;
        }
        principais.push({
          descricao: t.descricao || t.categoriaNome || 'Lançamento',
          valor: val,
          tipo: t.tipo
        });
      }
    });

    const saldoDia = totalReceitas - totalDespesas;

    // Formatação de moeda
    const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    // Ordenar todos os lançamentos por valor (maiores primeiro)
    principais.sort((a, b) => b.valor - a.valor);

    // Montar a mensagem
    let mensagem = `📊 *Resumo Diário - ${displayData}*\n`;
    mensagem += `*${nomeSistema}*\n\n`;

    if (principais.length === 0) {
      mensagem += `🟢 *Total Entradas:* ${fmt(0)}\n`;
      mensagem += `🔴 *Total Saídas:* ${fmt(0)}\n`;
      mensagem += `🏦 *Saldo do Dia:* ${fmt(0)} (Sem novas movimentações hoje)\n`;
    } else {
      mensagem += `🟢 *Total Entradas:* ${fmt(totalReceitas)}\n`;
      mensagem += `🔴 *Total Saídas:* ${fmt(totalDespesas)}\n\n`;
      
      const saldoTxt = saldoDia >= 0 ? 'positivo no dia' : 'negativo no dia';
      const bancoIcon = saldoDia >= 0 ? '🏦' : '📉';
      mensagem += `${bancoIcon} *Saldo do Dia:* ${fmt(Math.abs(saldoDia))} ${saldoTxt}\n`;

      mensagem += `\n*Lançamentos do Dia (${principais.length}):*\n`;
      principais.slice(0, 10).forEach(t => {
        const icon = t.tipo === 'receita' ? '🟢' : '🔴';
        mensagem += `${icon} ${t.descricao}: ${fmt(t.valor)}\n`;
      });
      if (principais.length > 10) {
        mensagem += `_... e mais ${principais.length - 10} lançamentos_\n`;
      }
    }

    mensagem += `\n_Gerado automaticamente por ${nomeSistema}_`;

    // Enviar mensagem
    let resultadoEnvio: any = null;
    if (telefoneMaster && telefoneMaster !== '5511999999999') {
      resultadoEnvio = await enviarMensagemWhatsApp(telefoneMaster, mensagem, apiUrl, apiToken);
      if (resultadoEnvio && resultadoEnvio.sucesso === false) {
        return NextResponse.json({
          success: false,
          error: resultadoEnvio.erro || 'Falha ao entregar no WhatsApp',
          resumo: mensagem
        }, { status: 502 });
      }
    } else {
      console.log('Mensagem simulada (telefone não real):', mensagem);
      return NextResponse.json({ success: false, error: 'Telefone não configurado', resumo: mensagem });
    }

    return NextResponse.json({ success: true, message: 'Fechamento diário enviado', resumo: mensagem });

  } catch (error: any) {
    console.error('Erro no cron fechamento diário:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
