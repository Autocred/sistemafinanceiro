import React, { useMemo, useRef } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, Legend
} from 'recharts';
import { Transacao } from '@/lib/types';
import { formatarMoeda } from '@/lib/storage';

// ─── TIPOS ────────────────────────────────────────────────────────────────────
interface DREGerencialProps {
  transacoes: Transacao[];
  dataInicio: string; // YYYY-MM-DD
  dataFim: string;    // YYYY-MM-DD
  transacoesAnteriores?: Transacao[]; // Opcional: período anterior para comparativo
}

interface DREData {
  receitaBruta: number;
  deducoes: number;
  receitaLiquida: number;
  cpv: number;
  margemContribuicao: number;
  despesasOperacionais: number;
  ebitda: number;
  margemLucro: number;
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function calcularDRE(transacoes: Transacao[]): DREData {
  let receitaBruta = 0;
  let deducoes = 0;
  let cpv = 0;
  let despesasOperacionais = 0;

  transacoes.forEach(t => {
    // Os dados recebidos já estão filtrados pelo componente pai (Relatorios.tsx)
    // de acordo com as preferências do usuário (Competência/Vencimento ou Lançamento) e período.
    const valor = t.valor;

    if (t.tipo === 'receita') {
      receitaBruta += valor;
    } else if (t.tipo === 'despesa') {
      // Classificação inteligente baseada no nome da categoria (simples para exemplo)
      const cat = (t.categoriaNome || '').toLowerCase();
      if (cat.includes('imposto') || cat.includes('taxa')) {
        deducoes += valor;
      } else if (
        cat.includes('fornecedor') ||
        cat.includes('matéria') ||
        cat.includes('estoque') ||
        cat.includes('mercadoria')
      ) {
        cpv += valor;
      } else {
        despesasOperacionais += valor;
      }
    }
  });

  const receitaLiquida = receitaBruta - deducoes;
  const margemContribuicao = receitaLiquida - cpv;
  const ebitda = margemContribuicao - despesasOperacionais; // Simplificado

  return {
    receitaBruta,
    deducoes,
    receitaLiquida,
    cpv,
    margemContribuicao,
    despesasOperacionais,
    ebitda,
    margemLucro: receitaBruta > 0 ? (ebitda / receitaBruta) * 100 : 0,
  };
}

/** Retorna variação percentual: ((atual - anterior) / anterior) * 100 */
function calcVariacao(atual: number, anterior: number): number | null {
  if (anterior === 0) return null;
  return ((atual - anterior) / Math.abs(anterior)) * 100;
}

// ─── SUB-COMPONENTES ──────────────────────────────────────────────────────────

/** Seta de comparativo com o período anterior */
function VariacaoIndicador({ variacao }: { variacao: number | null }) {
  if (variacao === null) return null;
  const positivo = variacao >= 0;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 2,
        fontSize: 11,
        fontWeight: 700,
        color: positivo ? '#10b981' : '#ef4444',
        marginLeft: 8,
        background: positivo ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
        padding: '2px 6px',
        borderRadius: 6,
        whiteSpace: 'nowrap',
      }}
    >
      {positivo ? '▲' : '▼'} {Math.abs(variacao).toFixed(1)}%
    </span>
  );
}

/** Linha individual do DRE */
function ItemDRE({
  label,
  valor,
  valorAnterior,
  isNegative = false,
  bold = false,
  isResult = false,
  invertVariacao = false,
}: {
  label: string;
  valor: number;
  valorAnterior?: number;
  isNegative?: boolean;
  bold?: boolean;
  isResult?: boolean;
  /** Se verdadeiro, aumentar o valor é ruim (ex: deduções, cpv, despesas) */
  invertVariacao?: boolean;
}) {
  const variacao = valorAnterior !== undefined ? calcVariacao(valor, valorAnterior) : null;
  // Inverte lógica de cor para itens negativos (aumentar despesas é ruim)
  const variacaoExibida =
    variacao !== null && invertVariacao ? variacao * -1 : variacao;

  const corValor =
    isNegative
      ? '#ef4444'
      : isResult && valor > 0
      ? '#10b981'
      : isResult && valor < 0
      ? '#ef4444'
      : 'inherit';

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 16px',
        borderBottom: isResult ? 'none' : '1px solid var(--border)',
        background: isResult ? 'var(--bg-secondary)' : 'transparent',
        borderRadius: isResult ? 8 : 0,
        fontWeight: bold || isResult ? 700 : 500,
        color: isResult ? 'var(--text-primary)' : 'var(--text-secondary)',
      }}
    >
      <span>{label}</span>
      <span style={{ display: 'flex', alignItems: 'center' }}>
        <span style={{ color: corValor }}>
          {isNegative ? '-' : ''}{formatarMoeda(valor)}
        </span>
        {variacaoExibida !== null && (
          <VariacaoIndicador variacao={variacaoExibida} />
        )}
      </span>
    </div>
  );
}

/** Card de indicador no topo */
function CardIndicador({
  label,
  valor,
  sub,
  corValor,
}: {
  label: string | React.ReactNode;
  valor: string;
  sub?: string;
  corValor: string;
}) {
  return (
    <div
      className="glass"
      style={{
        padding: '18px 20px',
        borderRadius: 14,
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        flex: 1,
        minWidth: 140,
      }}
    >
      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </span>
      <span style={{ fontSize: 20, fontWeight: 800, color: corValor, lineHeight: 1.2 }}>
        {valor}
      </span>
      {sub && (
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{sub}</span>
      )}
    </div>
  );
}

// ─── COMPONENTE PRINCIPAL ────────────────────────────────────────────────────
export function DREGerencial({
  transacoes,
  dataInicio,
  dataFim,
  transacoesAnteriores,
}: DREGerencialProps) {
  const dreRef = useRef<HTMLDivElement>(null);

  // Cálculo do DRE atual
  const dre = useMemo(
    () => calcularDRE(transacoes),
    [transacoes, dataInicio, dataFim]
  );

  // Cálculo do DRE anterior (para comparativo)
  const dreAnt = useMemo(
    () => (transacoesAnteriores ? calcularDRE(transacoesAnteriores) : null),
    [transacoesAnteriores]
  );

  // ─── Dados do gráfico de barras horizontal ──────────────────────────────
  // Top categorias de receita
  const receitasPorCat: Record<string, number> = {};
  const despesasPorCat: Record<string, number> = {};
  transacoes.forEach(t => {
    const cat = t.categoriaNome || 'Outros';
    if (t.tipo === 'receita') {
      receitasPorCat[cat] = (receitasPorCat[cat] || 0) + t.valor;
    } else if (t.tipo === 'despesa') {
      despesasPorCat[cat] = (despesasPorCat[cat] || 0) + t.valor;
    }
  });

  const TOP_N = 5;
  const topReceitas = Object.entries(receitasPorCat)
    .sort((a, b) => b[1] - a[1])
    .slice(0, TOP_N)
    .map(([cat, valor]) => ({ cat, receita: valor, despesa: 0 }));
  const topDespesas = Object.entries(despesasPorCat)
    .sort((a, b) => b[1] - a[1])
    .slice(0, TOP_N)
    .map(([cat, valor]) => ({ cat, receita: 0, despesa: valor }));

  // Mescla para exibição lado a lado
  const allCats = Array.from(
    new Set([...topReceitas.map(r => r.cat), ...topDespesas.map(d => d.cat)])
  ).slice(0, TOP_N * 2);

  const dadosGrafico = allCats.map(cat => ({
    cat,
    receita: receitasPorCat[cat] || 0,
    despesa: despesasPorCat[cat] || 0,
  }));

  // ─── Exportar PDF ──────────────────────────────────────────────────────
  const exportarPDF = async () => {
    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    // Cabeçalho
    doc.setFontSize(22);
    doc.setTextColor(30, 58, 138); // #1e3a8a
    doc.text('DRE Gerencial (P&L)', 14, 22);

    doc.setFontSize(11);
    doc.setTextColor(100, 116, 139);
    doc.text(`Período: ${dataInicio.split('-').reverse().join('/')} a ${dataFim.split('-').reverse().join('/')}`, 14, 30);
    doc.text('Demonstração do Resultado do Exercício - Classificação Inteligente', 14, 36);

    // Linha separadora
    doc.setDrawColor(226, 232, 240);
    doc.line(14, 40, 196, 40);

    // Tabela DRE
    const linhas: [string, string, string][] = [
      ['Receita Bruta de Vendas', formatarMoeda(dre.receitaBruta), dreAnt ? formatarMoeda(dreAnt.receitaBruta) : '-'],
      ['(-) Deduções e Impostos', `-${formatarMoeda(dre.deducoes)}`, dreAnt ? `-${formatarMoeda(dreAnt.deducoes)}` : '-'],
      ['(=) Receita Líquida', formatarMoeda(dre.receitaLiquida), dreAnt ? formatarMoeda(dreAnt.receitaLiquida) : '-'],
      ['(-) Custos Variáveis (CPV/CMV)', `-${formatarMoeda(dre.cpv)}`, dreAnt ? `-${formatarMoeda(dreAnt.cpv)}` : '-'],
      ['(=) Margem de Contribuição', formatarMoeda(dre.margemContribuicao), dreAnt ? formatarMoeda(dreAnt.margemContribuicao) : '-'],
      ['(-) Despesas Operacionais (Fixas)', `-${formatarMoeda(dre.despesasOperacionais)}`, dreAnt ? `-${formatarMoeda(dreAnt.despesasOperacionais)}` : '-'],
      ['(=) EBITDA / Resultado Operacional', formatarMoeda(dre.ebitda), dreAnt ? formatarMoeda(dreAnt.ebitda) : '-'],
      ['Margem de Lucratividade', `${dre.margemLucro.toFixed(1)}%`, dreAnt ? `${dreAnt.margemLucro.toFixed(1)}%` : '-'],
    ];

    const headers = dreAnt
      ? [['Linha DRE', 'Período Atual', 'Período Anterior']]
      : [['Linha DRE', 'Valor']];

    const body = dreAnt
      ? linhas
      : linhas.map(([label, atual]) => [label, atual]);

    autoTable(doc, {
      startY: 46,
      head: headers,
      body: body,
      theme: 'grid',
      headStyles: { fillColor: [30, 58, 138], fontSize: 10, fontStyle: 'bold' },
      bodyStyles: { fontSize: 10, cellPadding: 4 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { fontStyle: 'normal', cellWidth: 100 },
        1: { halign: 'right', fontStyle: 'bold' },
        2: { halign: 'right', textColor: [100, 116, 139] },
      },
      didParseCell: (data: any) => {
        // Linhas de resultado em negrito com fundo azul claro
        if ([2, 4, 6, 7].includes(data.row.index) && data.section === 'body') {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [239, 246, 255];
        }
      },
    });

    const finalY = (doc as any).lastAutoTable?.finalY || 120;

    // Rodapé com indicadores
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')} — Sistema Financeiro Pessoal`,
      14,
      finalY + 14
    );

    doc.save(`DRE-Gerencial-${dataInicio}-${dataFim}.pdf`);
  };

  // ─── RENDER ────────────────────────────────────────────────────────────
  return (
    <div ref={dreRef} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Cabeçalho */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>
            DRE Gerencial (P&L)
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Demonstração do Resultado do Exercício — Classificação Inteligente
            {transacoesAnteriores && (
              <span style={{ marginLeft: 8, color: '#818cf8', fontWeight: 600 }}>
                · Com comparativo ao período anterior
              </span>
            )}
          </p>
        </div>
        <button
          onClick={exportarPDF}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '9px 18px', borderRadius: 10, fontSize: 13, fontWeight: 700,
            background: '#1e3a8a', color: '#fff', border: 'none', cursor: 'pointer',
            transition: 'opacity 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
        >
          ⬇ Exportar PDF
        </button>
      </div>

      {/* Cards de Indicadores */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        <CardIndicador
          label="Receita Bruta"
          valor={formatarMoeda(dre.receitaBruta)}
          sub={dreAnt ? `Anterior: ${formatarMoeda(dreAnt.receitaBruta)}` : undefined}
          corValor="#10b981"
        />
        <CardIndicador
          label="Margem de Contribuição"
          valor={formatarMoeda(dre.margemContribuicao)}
          sub={dreAnt ? `Anterior: ${formatarMoeda(dreAnt.margemContribuicao)}` : undefined}
          corValor={dre.margemContribuicao >= 0 ? '#10b981' : '#ef4444'}
        />
        <CardIndicador
          label={<span title="Lucro Antes de Juros, Impostos, Depreciação e Amortização (Resultado Operacional)">EBITDA <span style={{ cursor: 'help', fontSize: 11 }}>❓</span></span>}
          valor={formatarMoeda(dre.ebitda)}
          sub={dreAnt ? `Anterior: ${formatarMoeda(dreAnt.ebitda)}` : undefined}
          corValor={dre.ebitda >= 0 ? '#1e3a8a' : '#ef4444'}
        />
        <CardIndicador
          label="Margem %"
          valor={`${dre.margemLucro.toFixed(1)}%`}
          sub={dreAnt ? `Anterior: ${dreAnt.margemLucro.toFixed(1)}%` : undefined}
          corValor={dre.margemLucro >= 0 ? '#10b981' : '#ef4444'}
        />
      </div>

      {/* Tabela DRE */}
      <div className="glass" style={{ padding: 24, borderRadius: 16 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 16 }}>
          Demonstração do Resultado
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <ItemDRE
            label="Receita Bruta de Vendas"
            valor={dre.receitaBruta}
            valorAnterior={dreAnt?.receitaBruta}
          />
          <ItemDRE
            label="(-) Deduções e Impostos"
            valor={dre.deducoes}
            valorAnterior={dreAnt?.deducoes}
            isNegative
            invertVariacao
          />
          <div style={{ marginTop: 4, marginBottom: 4 }}>
            <ItemDRE
              label="(=) Receita Líquida"
              valor={dre.receitaLiquida}
              valorAnterior={dreAnt?.receitaLiquida}
              bold
              isResult
            />
          </div>

          <ItemDRE
            label="(-) Custos Variáveis (CPV/CMV)"
            valor={dre.cpv}
            valorAnterior={dreAnt?.cpv}
            isNegative
            invertVariacao
          />
          <div style={{ marginTop: 4, marginBottom: 4 }}>
            <ItemDRE
              label="(=) Margem de Contribuição"
              valor={dre.margemContribuicao}
              valorAnterior={dreAnt?.margemContribuicao}
              bold
              isResult
            />
          </div>

          <ItemDRE
            label="(-) Despesas Operacionais (Fixas)"
            valor={dre.despesasOperacionais}
            valorAnterior={dreAnt?.despesasOperacionais}
            isNegative
            invertVariacao
          />

          <div style={{ marginTop: 8 }}>
            <ItemDRE
              label="(=) EBITDA / Resultado Operacional"
              valor={dre.ebitda}
              valorAnterior={dreAnt?.ebitda}
              bold
              isResult
            />
          </div>
        </div>

        {/* Margem de lucratividade */}
        <div
          style={{
            marginTop: 20,
            padding: 16,
            borderRadius: 12,
            background: 'linear-gradient(135deg, rgba(30,58,138,0.08), rgba(16,185,129,0.05))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 8,
          }}
        >
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-secondary)' }}>
            Margem de Lucratividade:
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                fontSize: 22,
                fontWeight: 800,
                color: dre.margemLucro >= 0 ? '#10b981' : '#ef4444',
              }}
            >
              {dre.margemLucro.toFixed(1)}%
            </span>
            {dreAnt && (
              <VariacaoIndicador
                variacao={calcVariacao(dre.margemLucro, dreAnt.margemLucro)}
              />
            )}
          </span>
        </div>
      </div>

      {/* Gráfico de Barras Horizontal: Receitas vs Despesas por Categoria */}
      {dadosGrafico.length > 0 && (
        <div className="glass" style={{ padding: 24, borderRadius: 16 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 20 }}>
            Receitas × Despesas por Categoria (Top {TOP_N})
          </h3>
          <ResponsiveContainer width="100%" height={dadosGrafico.length * 52 + 40}>
            <BarChart
              data={dadosGrafico}
              layout="vertical"
              margin={{ left: 8, right: 16, top: 0, bottom: 0 }}
              barCategoryGap="28%"
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--bg-glass)" />
              <XAxis
                type="number"
                tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`}
                tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                dataKey="cat"
                type="category"
                tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={110}
              />
              <Tooltip
                contentStyle={{
                  background: '#1f2937',
                  border: '1px solid var(--border-hover)',
                  borderRadius: 10,
                  fontSize: 12,
                }}
                labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                formatter={(v: unknown) => [formatarMoeda(Number(v))]}
              />
              <Legend
                wrapperStyle={{ fontSize: 12, color: 'var(--text-secondary)', paddingTop: 8 }}
              />
              <Bar dataKey="receita" name="Receita" fill="#10b981" radius={[0, 4, 4, 0]} />
              <Bar dataKey="despesa" name="Despesa" fill="#ef4444" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
