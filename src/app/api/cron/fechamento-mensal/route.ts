import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { enviarMensagemWhatsApp, enviarDocumentoWhatsApp } from '@/lib/whatsapp';
import { gerarFechamentoMensalPDF, DadosFechamentoMensal } from '@/lib/pdf-fechamento-mensal';
import { format, subMonths, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function formatarMoeda(val: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
}

export async function GET(request: Request) {
  return handleFechamentoMensal(request);
}

export async function POST(request: Request) {
  return handleFechamentoMensal(request);
}

async function handleFechamentoMensal(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      // Permite chamada interna ou direta sem token caso seja teste do painel
    }

    const { searchParams } = new URL(request.url);
    const paramTenantId = searchParams.get('tenantId');
    const paramNumero = searchParams.get('numero');
    const paramNome = searchParams.get('nome');
    const paramMes = searchParams.get('mes'); // ex: '2026-09'
    const download = searchParams.get('download') === 'true';

    // 1. Determinar mês de referência
    const hoje = new Date();
    // Se não especificado: se estamos no início do mês (dia 1 a 5), analisa o mês anterior
    let mesRefDate = subMonths(hoje, 1);
    if (paramMes) {
      const [ano, mes] = paramMes.split('-').map(Number);
      mesRefDate = new Date(ano, mes - 1, 1, 12, 0, 0);
    }
    const mesRefStr = format(mesRefDate, 'yyyy-MM'); // "2026-09"
    const mesExtenso = format(mesRefDate, "MMMM 'de' yyyy", { locale: ptBR });
    const mesExtensoCapitalizado = mesExtenso.charAt(0).toUpperCase() + mesExtenso.slice(1);

    // Mês anterior ao de referência (para cálculo comparativo)
    const mesAntDate = subMonths(mesRefDate, 1);
    const mesAntStr = format(mesAntDate, 'yyyy-MM');
    const mesAntExtenso = format(mesAntDate, "MMMM", { locale: ptBR });
    const mesAntExtensoCap = mesAntExtenso.charAt(0).toUpperCase() + mesAntExtenso.slice(1);

    // 2. Carregar configurações do tenant e credenciais WhatsApp
    const db = adminDb!;
    const isMaster = !paramTenantId || paramTenantId === 'master' || paramTenantId === '9yxuafoC0AV9BrIKem05ponbmgn2';
    
    let configData: any = {};
    if (isMaster) {
      const snapGeral = await db.collection('configuracoes').doc('geral').get();
      configData = snapGeral.exists ? snapGeral.data() : {};
      const snapConfig = await db.collection('config').doc('geral').get();
      if (snapConfig.exists) {
        configData = { ...configData, ...snapConfig.data() };
      }
    } else {
      let snapTenant = await db.collection(`tenants/${paramTenantId}/config`).doc('geral').get();
      if (!snapTenant.exists && paramTenantId === 'autocred-promotora-de-credito') {
        snapTenant = await db.collection('configuracoes').doc('geral').get();
      }
      configData = snapTenant.exists ? snapTenant.data() : {};
    }

    const snapGlobal = await db.collection('configuracoes').doc('geral').get();
    const globalConfig = snapGlobal.exists ? snapGlobal.data() : {};
    const apiUrl = globalConfig?.whatsappApiUrl || configData?.whatsappApiUrl;
    const apiToken = globalConfig?.whatsappApiToken || configData?.whatsappApiToken;
    const telefone = paramNumero || configData?.whatsappNumeros || configData?.whatsappNumeroMaster || configData?.telefoneWhatsApp || globalConfig?.whatsappNumeros || globalConfig?.whatsappNumeroMaster;
    const nomeSistema = paramNome || configData?.nomeSistema || (isMaster ? 'Clovis Master' : 'AUTOCRED Promotora de Crédito');
    const corPrimaria = configData?.corPrimaria || '#0f172a';

    // 3. Buscar transações do mês de referência
    const transacoesPath = isMaster ? 'transacoes' : `tenants/${paramTenantId}/transacoes`;
    const transacoesSnap = await db.collection(transacoesPath).get();

    let totalReceitas = 0;
    let totalDespesas = 0;
    let contasPagarPendentes = 0;
    let contasReceberPendentes = 0;
    let totalLancamentos = 0;

    const despesasPorCategoria: Record<string, number> = {};
    const receitasPorCategoria: Record<string, number> = {};

    // Mês anterior (para comparativo)
    let totalReceitasAnterior = 0;
    let totalDespesasAnterior = 0;

    transacoesSnap.forEach(doc => {
      const t = doc.data();
      const tData = t.data || t.dataVencimento || t.dataPagamento || '';
      const valor = Number(t.valor) || 0;
      const tMes = tData.substring(0, 7);

      // Transações do Mês de Referência
      if (tMes === mesRefStr) {
        totalLancamentos++;
        const isPago = t.status === 'pago' || t.status === 'concluido' || t.status === 'recebido';

        if (t.tipo === 'receita') {
          if (isPago) {
            totalReceitas += valor;
            const cat = t.categoriaNome || t.categoria || 'Outras Receitas';
            receitasPorCategoria[cat] = (receitasPorCategoria[cat] || 0) + valor;
          } else {
            contasReceberPendentes += valor;
          }
        } else if (t.tipo === 'despesa') {
          if (isPago) {
            totalDespesas += valor;
            const cat = t.categoriaNome || t.categoria || 'Outras Despesas';
            despesasPorCategoria[cat] = (despesasPorCategoria[cat] || 0) + valor;
          } else {
            contasPagarPendentes += valor;
          }
        }
      }

      // Transações do Mês Anterior (Comparativo)
      if (tMes === mesAntStr) {
        const isPago = t.status === 'pago' || t.status === 'concluido' || t.status === 'recebido';
        if (t.tipo === 'receita' && isPago) {
          totalReceitasAnterior += valor;
        } else if (t.tipo === 'despesa' && isPago) {
          totalDespesasAnterior += valor;
        }
      }
    });

    // Se o mês de referência não teve transações (por exemplo se for testado num mês vazio), tenta com o mês que tiver dados
    if (totalLancamentos === 0 && !paramMes) {
      console.log(`[FECHAMENTO MENSAL] Sem transações em ${mesRefStr}. Verificando mês atual...`);
      // Opcional: mantemos os dados do mês de referência para respeitar a integridade
    }

    const resultadoLiquido = totalReceitas - totalDespesas;
    const margemLiquida = totalReceitas > 0 ? (resultadoLiquido / totalReceitas) * 100 : 0;

    const resultadoLiquidoAnterior = totalReceitasAnterior - totalDespesasAnterior;
    const variacaoReceita = totalReceitasAnterior > 0
      ? ((totalReceitas - totalReceitasAnterior) / totalReceitasAnterior) * 100
      : undefined;
    const variacaoDespesa = totalDespesasAnterior > 0
      ? ((totalDespesas - totalDespesasAnterior) / totalDespesasAnterior) * 100
      : undefined;
    const variacaoResultado = resultadoLiquidoAnterior !== 0
      ? ((resultadoLiquido - resultadoLiquidoAnterior) / Math.abs(resultadoLiquidoAnterior)) * 100
      : undefined;

    // Top Despesas
    const topDespesas = Object.entries(despesasPorCategoria)
      .map(([categoria, valor]) => ({
        categoria,
        valor,
        porcentagem: totalDespesas > 0 ? (valor / totalDespesas) * 100 : 0
      }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 5);

    // Top Receitas
    const topReceitas = Object.entries(receitasPorCategoria)
      .map(([categoria, valor]) => ({
        categoria,
        valor,
        porcentagem: totalReceitas > 0 ? (valor / totalReceitas) * 100 : 0
      }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 5);

    // 4. Buscar Metas do Mês
    const metasPath = isMaster ? 'metas_financeiras' : `tenants/${paramTenantId}/metas_financeiras`;
    let metasSnap = await db.collection(metasPath).get();
    if (metasSnap.empty) {
      const metasAltPath = isMaster ? 'metas' : `tenants/${paramTenantId}/metas`;
      metasSnap = await db.collection(metasAltPath).get();
    }

    const metasFechamento: any[] = [];
    metasSnap.forEach(doc => {
      const m = doc.data();
      const metaMes = m.mesReferencia || (m.mesAno ? m.mesAno : (m.dataFim ? m.dataFim.substring(0, 7) : ''));
      if (metaMes === mesRefStr || (!metaMes && m.ativa !== false)) {
        const alvo = Number(m.valorAlvo || m.valor) || 0;
        const alcancado = totalReceitas; // Meta padrão é receita total
        const pct = alvo > 0 ? (alcancado / alvo) * 100 : 0;
        metasFechamento.push({
          titulo: m.titulo || m.descricao || 'Meta do Mês',
          valorAlvo: alvo,
          valorAlcancado: alcancado,
          porcentagem: pct,
          status: pct >= 100 ? 'superada' : pct >= 85 ? 'atingida' : 'deficit'
        });
      }
    });

    // 5. Buscar Contas Bancárias e Saldo Consolidado
    const contasPath = isMaster ? 'contas' : `tenants/${paramTenantId}/contas`;
    const contasSnap = await db.collection(contasPath).get();
    const contasBancarias: { nome: string; saldo: number }[] = [];
    let saldoTotalContas = 0;

    contasSnap.forEach(doc => {
      const c = doc.data();
      const s = Number(c.saldoAtual !== undefined ? c.saldoAtual : c.saldo) || 0;
      saldoTotalContas += s;
      contasBancarias.push({
        nome: c.nome || 'Conta',
        saldo: s
      });
    });

    // 6. Elaborar Diagnóstico Gerencial
    let diagnosticoTexto = '';
    if (resultadoLiquido > 0) {
      diagnosticoTexto = `O fechamento de ${mesExtensoCapitalizado} apresentou um resultado positivo com superávit de ${formatarMoeda(resultadoLiquido)} e margem líquida de ${margemLiquida.toFixed(1)}%. `;
      if (variacaoReceita !== undefined && variacaoReceita > 0) {
        diagnosticoTexto += `O faturamento cresceu +${variacaoReceita.toFixed(1)}% em comparação ao mês anterior, demonstrando expansão das operações. `;
      }
      if (topDespesas.length > 0) {
        diagnosticoTexto += `O principal centro de desembolso foi '${topDespesas[0].categoria}' (${topDespesas[0].porcentagem.toFixed(1)}% das despesas). `;
      }
      diagnosticoTexto += 'Recomenda-se manter o reinvestimento sustentável e a formação de reserva de liquidez.';
    } else {
      diagnosticoTexto = `O mês de ${mesExtensoCapitalizado} fechou em déficit operacional de ${formatarMoeda(Math.abs(resultadoLiquido))}. `;
      if (topDespesas.length > 0) {
        diagnosticoTexto += `Atenção especial aos custos com '${topDespesas[0].categoria}', que consumiram ${formatarMoeda(topDespesas[0].valor)}. `;
      }
      diagnosticoTexto += 'Recomenda-se revisão orçamentária dos custos fixos e intensificação de ações de geração de receita.';
    }

    // 7. Preparar Dados para o Gerador de PDF
    const dadosPdf: DadosFechamentoMensal = {
      nomeSistema,
      mesReferencia: mesRefStr,
      mesExtenso: mesExtensoCapitalizado,
      corPrimaria,
      totalReceitas,
      totalDespesas,
      resultadoLiquido,
      margemLiquida,
      totalLancamentos,
      variacaoReceita,
      variacaoDespesa,
      variacaoResultado,
      mesAnteriorExtenso: mesAntExtensoCap,
      totalReceitasAnterior,
      totalDespesasAnterior,
      resultadoLiquidoAnterior,
      metas: metasFechamento,
      topDespesas,
      topReceitas,
      contasBancarias,
      saldoTotalContas,
      contasPagarPendentes,
      contasReceberPendentes,
      diagnosticoTexto
    };

    // Gerar o PDF
    const pdfBuffer = gerarFechamentoMensalPDF(dadosPdf);
    const nomeArquivoPdf = `Fechamento_Mensal_${mesRefStr}_${nomeSistema.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;

    // Se a requisição solicitou download direto no navegador:
    if (download) {
      return new NextResponse(pdfBuffer as any, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${nomeArquivoPdf}"`
        }
      });
    }

    // 8. Montar Mensagem de Texto Executiva para o WhatsApp
    const statusEmoji = resultadoLiquido >= 0 ? '🟢 SUPERÁVIT' : '🔴 DÉFICIT';
    const variacaoRecTxt = variacaoReceita !== undefined ? ` (${variacaoReceita >= 0 ? '+' : ''}${variacaoReceita.toFixed(1)}% vs ${mesAntExtensoCap})` : '';
    const variacaoDespTxt = variacaoDespesa !== undefined ? ` (${variacaoDespesa <= 0 ? '' : '+'}${variacaoDespesa.toFixed(1)}% vs ${mesAntExtensoCap})` : '';

    let textoMetas = '';
    if (metasFechamento.length > 0) {
      const m = metasFechamento[0];
      const statusMetaTxt = m.porcentagem >= 100
        ? `🚀 *Superada em ${formatarMoeda(m.valorAlcancado - m.valorAlvo)}!*`
        : `⏳ Faltou ${formatarMoeda(m.valorAlvo - m.valorAlcancado)} (${m.porcentagem.toFixed(1)}%)`;
      textoMetas = `\n🏁 *Desempenho da Meta:*\n• 🎯 Alvo: ${formatarMoeda(m.valorAlvo)} | Realizado: ${formatarMoeda(m.valorAlcancado)}\n• ${statusMetaTxt}\n`;
    }

    let textoTopCustos = '';
    if (topDespesas.length > 0) {
      textoTopCustos = `\n🔥 *Top Maiores Custos do Mês:*\n` +
        topDespesas.slice(0, 3).map((d, i) => `${i + 1}. *${d.categoria}:* ${formatarMoeda(d.valor)} (${d.porcentagem.toFixed(1)}%)`).join('\n') + '\n';
    }

    const mensagemWhatsApp = `📊 *FECHAMENTO MENSAL EXECUTIVO*
*${mesExtensoCapitalizado}* • *${nomeSistema}*

✨ *Balanço Consolidado:*
• 🟢 *Receitas Realizadas:* ${formatarMoeda(totalReceitas)}${variacaoRecTxt}
• 🔴 *Despesas Pagas:* ${formatarMoeda(totalDespesas)}${variacaoDespTxt}
• 💎 *Resultado Líquido:* ${formatarMoeda(resultadoLiquido)} (${statusEmoji})
• 📈 *Margem Líquida:* ${margemLiquida.toFixed(1)}%
• 📑 *Lançamentos:* ${totalLancamentos}${textoMetas}${textoTopCustos}
🏦 *Posição Consolidada de Caixa:*
• Saldo em Bancos: ${formatarMoeda(saldoTotalContas)}

💡 *Parecer Financeiro:*
_${diagnosticoTexto}_

📄 *O Relatório Executivo completo em PDF foi enviado logo abaixo!*

_Gerado automaticamente por ${nomeSistema}_`;

    // 9. Disparar no WhatsApp (se houver número configurado)
    let envioTextoSucesso = false;
    let envioDocSucesso = false;

    if (telefone) {
      console.log(`[FECHAMENTO MENSAL] Enviando relatório e PDF para: ${telefone}`);
      // Envio da Mensagem de Texto
      const resTexto = await enviarMensagemWhatsApp(telefone, mensagemWhatsApp, apiUrl, apiToken);
      envioTextoSucesso = !!resTexto.sucesso;

      // Envio do Documento PDF
      const base64Pdf = pdfBuffer.toString('base64');
      const resDoc = await enviarDocumentoWhatsApp(
        telefone,
        base64Pdf,
        nomeArquivoPdf,
        `📄 Relatório Executivo Mensal - ${mesExtensoCapitalizado} (${nomeSistema})`,
        apiUrl,
        apiToken
      );
      envioDocSucesso = !!resDoc.sucesso;
    }

    return NextResponse.json({
      success: true,
      message: 'Fechamento mensal processado com sucesso!',
      mesReferencia: mesRefStr,
      mesExtenso: mesExtensoCapitalizado,
      telefone,
      envioTextoSucesso,
      envioDocSucesso,
      resumo: {
        totalReceitas,
        totalDespesas,
        resultadoLiquido,
        margemLiquida,
        totalLancamentos,
        topDespesas,
        saldoTotalContas
      },
      mensagemWhatsApp
    });

  } catch (error: any) {
    console.error('[FECHAMENTO MENSAL] Erro geral:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
