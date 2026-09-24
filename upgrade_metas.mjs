import fs from 'fs';

let c = fs.readFileSync('src/components/MetasGamificadasV2.tsx', 'utf8');

// The new calculations block
const newCalcs = `
  // Helpers para dias úteis
  const isDiaUtil = (d: Date) => {
    const dia = d.getDay();
    return dia !== 0 && dia !== 6;
  };
  const calcularDiasUteis = (inicio: Date, fim: Date) => {
    let cont = 0;
    let atual = new Date(inicio);
    while (atual <= fim) {
      if (isDiaUtil(atual)) cont++;
      atual = addDays(atual, 1);
    }
    return cont;
  };

  let chartData: any[] = [];
  let destaqueProgresso = { realizado: 0, pct: 0 };
  
  // Variaveis novas para a tela avançada
  let diasUteisTotal = 0;
  let diasUteisDecorridos = 0;
  let diasUteisRestantes = 0;
  let metaDiariaGlobal = 0;
  let mediaDiariaRealizada = 0;
  let projecaoFimMes = 0;
  let variacao = 0;
  let taxaCumprimento = 0;
  let metaDiariaAjustada = 0; // Necessário pros proximos dias
  let valorFaltante = 0;

  if (metaDestaque) {
    destaqueProgresso = calcularProgressoMeta(metaDestaque);
    valorFaltante = Math.max(0, metaDestaque.valorAlvo - destaqueProgresso.realizado);
    
    const dInicio = parseISO(metaDestaque.dataInicio);
    const dFim = parseISO(metaDestaque.dataTermino);
    const hoje = new Date();
    
    diasUteisTotal = calcularDiasUteis(dInicio, dFim);
    const dataLimite = isBefore(hoje, dFim) ? hoje : dFim;
    diasUteisDecorridos = calcularDiasUteis(dInicio, dataLimite);
    diasUteisRestantes = diasUteisTotal - diasUteisDecorridos;
    if (diasUteisRestantes < 0) diasUteisRestantes = 0;

    metaDiariaGlobal = diasUteisTotal > 0 ? metaDestaque.valorAlvo / diasUteisTotal : 0;
    mediaDiariaRealizada = diasUteisDecorridos > 0 ? destaqueProgresso.realizado / diasUteisDecorridos : 0;
    projecaoFimMes = mediaDiariaRealizada * diasUteisTotal;
    variacao = projecaoFimMes - metaDestaque.valorAlvo;
    taxaCumprimento = metaDestaque.valorAlvo > 0 ? (projecaoFimMes / metaDestaque.valorAlvo) * 100 : 0;
    metaDiariaAjustada = diasUteisRestantes > 0 ? valorFaltante / diasUteisRestantes : 0;

    const dias = eachDayOfInterval({ start: dInicio, end: dFim });
    let acumulado = 0;
    let idealAcumulado = 0;
    
    chartData = dias.map(d => {
      if (isDiaUtil(d)) idealAcumulado += metaDiariaGlobal;
      
      let realizadoDia = 0;
      if (isBefore(d, addDays(hoje, 1))) {
        transacoes.forEach(t => {
          if (t.status === 'pago' && t.tipo === metaDestaque.tipo) {
            if (!metaDestaque.categoria || t.categoria === metaDestaque.categoria) {
              const dt = t.dataPagamento || t.dataCompetencia || t.dataVencimento || t.dataCadastro;
              if (dt && dt.startsWith(format(d, 'yyyy-MM-dd'))) {
                realizadoDia += Math.abs(getValorFinal(t));
              }
            }
          }
        });
        acumulado += realizadoDia;
        return {
          dia: format(d, 'dd/MM'),
          realizado: acumulado,
          ideal: idealAcumulado
        };
      } else {
        return {
          dia: format(d, 'dd/MM'),
          ideal: idealAcumulado
        };
      }
    });
  }
`;

const newRender = `
      {/* Destaque Meta Ativa AVANÇADA */}
      {metaDestaque && (
        <div style={{ background: '#1e3a8a', borderRadius: 16, border: '1px solid #1e40af', overflow: 'hidden', marginBottom: 32, padding: 24, boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 16 }}>
            {/* Alvo */}
            <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 11, color: '#93c5fd', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}><Target size={14}/> Alvo</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: '#fff', marginTop: 4 }}>{formatarMoeda(metaDestaque.valorAlvo)}</div>
            </div>
            {/* Atingido */}
            <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 11, color: '#34d399', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}><CheckCircle2 size={14}/> Atingido</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: '#fff', marginTop: 4 }}>{formatarMoeda(destaqueProgresso.realizado)}</div>
              <div style={{ fontSize: 11, color: '#34d399', fontWeight: 700, marginTop: 4 }}>{destaqueProgresso.pct.toFixed(1)}%</div>
            </div>
            {/* Falta */}
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 11, color: '#f87171', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}><X size={14}/> Falta</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: '#fff', marginTop: 4 }}>{formatarMoeda(valorFaltante)}</div>
              <div style={{ fontSize: 11, color: '#fca5a5', fontWeight: 700, marginTop: 4 }}>{diasUteisRestantes} dias úteis restantes</div>
            </div>
            {/* Meta Diária */}
            <div style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 11, color: '#a78bfa', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}><Activity size={14}/> Meta Diária Global</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: '#fff', marginTop: 4 }}>{formatarMoeda(metaDiariaGlobal)}</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 16 }}>
            {/* Total Dias Uteis */}
            <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 11, color: '#93c5fd', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}><CalendarDays size={14}/> Total Dias Úteis</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: '#fff', marginTop: 4 }}>{diasUteisTotal}</div>
            </div>
            {/* Decorridos */}
            <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 11, color: '#fbbf24', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}><Zap size={14}/> Decorridos</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: '#fff', marginTop: 4 }}>{diasUteisDecorridos}</div>
            </div>
            {/* Media Diaria */}
            <div style={{ background: 'rgba(14,165,233,0.1)', border: '1px solid rgba(14,165,233,0.2)', borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 11, color: '#38bdf8', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}><TrendingUp size={14}/> Média Diária Realizada</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: '#fff', marginTop: 4 }}>{formatarMoeda(mediaDiariaRealizada)}</div>
            </div>
            {/* Projecao */}
            <div style={{ background: 'rgba(236,72,153,0.1)', border: '1px solid rgba(236,72,153,0.2)', borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 11, color: '#f472b6', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}><Target size={14}/> Projeção Fim do Mês</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: '#fff', marginTop: 4 }}>{formatarMoeda(projecaoFimMes)}</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
            {/* Variacao */}
            <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 11, color: '#93c5fd', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}><Activity size={14}/> Variação (Projeção vs Alvo)</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: variacao >= 0 ? '#10b981' : '#ef4444', marginTop: 4 }}>
                {variacao >= 0 ? '+' : ''}{formatarMoeda(variacao)}
              </div>
            </div>
            {/* Taxa Cumprimento */}
            <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 11, color: '#93c5fd', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}><TrendingUp size={14}/> Taxa Cumprimento Projetada</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: taxaCumprimento >= 100 ? '#10b981' : '#f59e0b', marginTop: 4 }}>
                {taxaCumprimento.toFixed(1)}%
              </div>
            </div>
          </div>

          {/* Progresso Bar */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#93c5fd' }}>Progresso Atual</span>
              <span style={{ fontSize: 15, fontWeight: 900, color: '#fff' }}>{destaqueProgresso.pct.toFixed(1)}%</span>
            </div>
            <div style={{ width: '100%', height: 16, background: 'rgba(0,0,0,0.3)', borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ width: Math.min(destaqueProgresso.pct, 100) + '%', height: '100%', background: 'linear-gradient(90deg, #3b82f6 0%, #10b981 100%)', borderRadius: 8, transition: 'width 1s ease' }}></div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 }}>
            <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 11, color: '#93c5fd', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>Meta Necessária P/ Dia Útil (Restante)</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: '#fff', marginTop: 4 }}>{formatarMoeda(metaDiariaAjustada)}</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 11, color: '#93c5fd', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>Ideal Acumulado (Até Hoje)</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: '#fff', marginTop: 4 }}>{formatarMoeda(metaDiariaGlobal * diasUteisDecorridos)}</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 11, color: '#93c5fd', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>Status Financeiro</div>
              <div style={{ fontSize: 16, fontWeight: 900, color: '#fff', marginTop: 4 }}>{formatarMoeda(valorFaltante)} restante</div>
              <div style={{ fontSize: 11, color: '#93c5fd', marginTop: 2 }}>{destaqueProgresso.pct.toFixed(1)}% concluído</div>
            </div>
          </div>

          {/* Gráfico */}
          <div style={{ background: 'rgba(0,0,0,0.15)', borderRadius: 12, padding: 20, border: '1px solid rgba(255,255,255,0.05)' }}>
            <h3 style={{ fontSize: 14, fontWeight: 800, color: '#fff', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}><TrendingUp size={16} color="#60a5fa" /> Evolução diária da meta</h3>
            <div style={{ height: 280, width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRealizado" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="dia" stroke="#94a3b8" fontSize={11} tickMargin={10} axisLine={false} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(v) => "R$ " + (v/1000).toFixed(0) + "k"} axisLine={false} tickLine={false} />
                  <Tooltip 
                    formatter={(val: any, name: any) => [formatarMoeda(val), name === 'realizado' ? 'Acumulado Real' : 'Alvo Ideal']}
                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px', color: '#fff' }}
                    itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                  />
                  <Area type="monotone" dataKey="ideal" name="ideal" stroke="#f59e0b" strokeWidth={2} fill="none" strokeDasharray="5 5" />
                  <Area type="monotone" dataKey="realizado" name="realizado" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorRealizado)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
`;

// Replace block 1: calculation
const parts = c.split('let chartData: any[] = [];');
const beforeCalc = parts[0];
const afterCalcPart = parts[1].split('// Ordenar histórico')[1];
const c1 = beforeCalc + newCalcs + '  // Ordenar histórico' + afterCalcPart;

// Replace block 2: render
const rParts = c1.split('{/* Destaque Meta Ativa */}');
const beforeRender = rParts[0];
const afterRenderPart = rParts[1].split('{/* Histórico de Metas */}')[1];

const finalCode = beforeRender + newRender + '      {/* Histórico de Metas */}' + afterRenderPart;

fs.writeFileSync('src/components/MetasGamificadasV2.tsx', finalCode);
console.log('MetasGamificadasV2 fully upgraded!');
