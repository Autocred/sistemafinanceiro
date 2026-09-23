const fs = require('fs');
let content = fs.readFileSync('current_dashboard.txt', 'utf-8');

// 1. Fix State
content = content.replace(
`  // Filtros
  const today = new Date();
  const [ano, setAno] = useState<number>(today.getFullYear());
  const [mes, setMes] = useState<number>(today.getMonth()); // 0 a 11`,
`  // Filtros
  const today = new Date();
  const [ano, setAno] = useState<number>(today.getFullYear());
  const [mes, setMes] = useState<number>(today.getMonth()); // 0 a 11
  const [statusFiltro, setStatusFiltro] = useState<'Todos' | 'pago' | 'pendente'>('pago');
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>('Todas');
  const [centroCustoFiltro, setCentroCustoFiltro] = useState<string>('Todos');

  const categoriasUnicas = useMemo(() => {
    return Array.from(new Set(transacoes.filter(t => t.tipo === 'despesa').map(t => t.categoriaNome || t.categoriaId || 'Outros'))).sort();
  }, [transacoes]);

  const centrosCustoUnicos = useMemo(() => {
    return Array.from(new Set(transacoes.filter(t => t.tipo === 'despesa').map(t => t.centroCustoNome || t.centroCustoId || 'Não Informado'))).sort();
  }, [transacoes]);`
);

// 2. Fix txMes
content = content.replace(
`  const txMes = useMemo(() => {
    const mesStr = \`\${ano}-\${String(mes + 1).padStart(2, '0')}\`;
    return transacoes.filter(t => String(t.data || '').startsWith(mesStr));
  }, [transacoes, ano, mes]);`,
`  const txMes = useMemo(() => {
    const mesStr = \`\${ano}-\${String(mes + 1).padStart(2, '0')}\`;
    return transacoes.filter(t => {
      if (!String(t.data || '').startsWith(mesStr)) return false;
      
      if (statusFiltro !== 'Todos') {
        if (statusFiltro === 'pago' && t.status !== 'pago' && t.status !== 'recebido') return false;
        if (statusFiltro === 'pendente' && t.status !== 'pendente') return false;
      }
      
      const cat = t.categoriaNome || t.categoriaId || 'Outros';
      if (categoriaFiltro !== 'Todas' && cat !== categoriaFiltro) return false;
      
      const cc = t.centroCustoNome || t.centroCustoId || 'Não Informado';
      if (centroCustoFiltro !== 'Todos' && cc !== centroCustoFiltro) return false;
      
      return true;
    });
  }, [transacoes, ano, mes, statusFiltro, categoriaFiltro, centroCustoFiltro]);`
);

// 3. Fix Imports
content = content.replace(
`import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, 
  PieChart, Pie, Legend
} from 'recharts';
import { 
  Calendar, CalendarDays, DollarSign, FileText, BarChart3, TrendingUp, TrendingDown,
  ChevronDown, Search, ArrowDownToLine, Printer
} from 'lucide-react';`,
`import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, 
  LabelList, Legend
} from 'recharts';
import { 
  Calendar, CalendarDays, DollarSign, FileText, BarChart3, TrendingUp, TrendingDown,
  ChevronDown, Search, ArrowDownToLine, Printer, CheckCircle2, Building2
} from 'lucide-react';`
);

// 4. Fix HTML Filters
content = content.replace(
`        <div className="bi-filters">
          <div className="filter-group">
            <CalendarDays size={18} color="var(--text-secondary)" />
            <select value={ano} onChange={(e) => setAno(Number(e.target.value))} className="bi-select">
              {ANOS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div className="filter-group">
            <Calendar size={18} color="var(--text-secondary)" />
            <select value={mes} onChange={(e) => setMes(Number(e.target.value))} className="bi-select">
              {MESES.map((m, idx) => <option key={m} value={idx}>{m}</option>)}
            </select>
          </div>
        </div>`,
`        <div className="bi-filters" style={{ flexWrap: 'wrap' }}>
          <div className="filter-group">
            <CalendarDays size={18} color="var(--text-secondary)" />
            <select value={ano} onChange={(e) => setAno(Number(e.target.value))} className="bi-select">
              {ANOS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div className="filter-group">
            <Calendar size={18} color="var(--text-secondary)" />
            <select value={mes} onChange={(e) => setMes(Number(e.target.value))} className="bi-select">
              {MESES.map((m, idx) => <option key={m} value={idx}>{m}</option>)}
            </select>
          </div>
          <div className="filter-group">
            <CheckCircle2 size={18} color="var(--text-secondary)" />
            <select value={statusFiltro} onChange={(e) => setStatusFiltro(e.target.value as any)} className="bi-select">
              <option value="Todos">Todos (Status)</option>
              <option value="pago">Pago / Recebido</option>
              <option value="pendente">Pendente</option>
            </select>
          </div>
          <div className="filter-group">
            <FileText size={18} color="var(--text-secondary)" />
            <select value={categoriaFiltro} onChange={(e) => setCategoriaFiltro(e.target.value)} className="bi-select">
              <option value="Todas">Todas Categorias</option>
              {categoriasUnicas.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="filter-group">
            <Building2 size={18} color="var(--text-secondary)" />
            <select value={centroCustoFiltro} onChange={(e) => setCentroCustoFiltro(e.target.value)} className="bi-select">
              <option value="Todos">Todos Centros</option>
              {centrosCustoUnicos.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>`
);

// 5. Replace Charts Grid completely
const startIdx = content.indexOf('{/* CHARTS GRID */}');
const endIdx = content.indexOf('{/* INDICADORES AUTOMÁTICOS & TABELA */}');

const newCharts = `{/* CHARTS GRID */}
      <div className="bi-charts-grid" style={{ gridTemplateColumns: '1fr' }}>
        
        {/* GRÁFICO 1: Gastos por Categoria */}
        <div className="bi-chart-container glass-panel hover-lift fade-in-up" style={{ animationDelay: '0.7s' }}>
          <h3 className="chart-title">Gastos por Categoria</h3>
          <div style={{ height: 400, width: '100%' }}>
            <ResponsiveContainer>
              <BarChart layout="vertical" data={gastosPorCategoria} margin={{ top: 20, right: 120, left: 30, bottom: 5 }}>
                <defs>
                  {gastosPorCategoria.map((entry, index) => (
                    <linearGradient key={\`grad-\${index}\`} id={\`colorUv-\${index}\`} x1="0" y1="0" x2="1" y2="0">
                      <stop offset="5%" stopColor={COLORS[index % COLORS.length]} stopOpacity={0.9}/>
                      <stop offset="95%" stopColor={COLORS[index % COLORS.length]} stopOpacity={0.5}/>
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="var(--border)" opacity={0.4} />
                <XAxis type="number" hide />
                <YAxis dataKey="nome" type="category" stroke="var(--text-secondary)" fontSize={13} tickLine={false} axisLine={false} width={130} />
                <RechartsTooltip content={customTooltip3D} cursor={{fill: 'var(--bg-hover)'}} />
                <Bar dataKey="valor" radius={[0, 6, 6, 0]} animationDuration={1500} barSize={25}>
                  {gastosPorCategoria.map((entry, index) => (
                    <Cell key={\`cell-\${index}\`} fill={\`url(#colorUv-\${index})\`} style={{ filter: 'drop-shadow(2px 4px 6px rgba(0,0,0,0.1))' }} />
                  ))}
                  <LabelList dataKey="valor" position="right" formatter={(v) => formatarMoeda(v)} style={{ fill: 'var(--text-primary)', fontSize: 13, fontWeight: 'bold' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* GRÁFICO 2: Gastos por Centro de Custo */}
        <div className="bi-chart-container glass-panel hover-lift fade-in-up" style={{ animationDelay: '0.8s' }}>
          <h3 className="chart-title">Gastos por Centro de Custo</h3>
          <div style={{ height: 400, width: '100%' }}>
            <ResponsiveContainer>
              <BarChart layout="vertical" data={gastosPorCentroCusto} margin={{ top: 20, right: 120, left: 30, bottom: 5 }}>
                <defs>
                  {gastosPorCentroCusto.map((entry, index) => (
                    <linearGradient key={\`grad-cc-\${index}\`} id={\`colorCc-\${index}\`} x1="0" y1="0" x2="1" y2="0">
                      <stop offset="5%" stopColor={COLORS[(index + 3) % COLORS.length]} stopOpacity={0.9}/>
                      <stop offset="95%" stopColor={COLORS[(index + 3) % COLORS.length]} stopOpacity={0.5}/>
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="var(--border)" opacity={0.4} />
                <XAxis type="number" hide />
                <YAxis dataKey="nome" type="category" stroke="var(--text-secondary)" fontSize={13} tickLine={false} axisLine={false} width={130} />
                <RechartsTooltip content={customTooltip3D} cursor={{fill: 'var(--bg-hover)'}} />
                <Bar dataKey="valor" radius={[0, 6, 6, 0]} animationDuration={1500} barSize={25}>
                  {gastosPorCentroCusto.map((entry, index) => (
                    <Cell key={\`cell-cc-\${index}\`} fill={\`url(#colorCc-\${index})\`} style={{ filter: 'drop-shadow(2px 4px 6px rgba(0,0,0,0.1))' }} />
                  ))}
                  <LabelList dataKey="valor" position="right" formatter={(v) => formatarMoeda(v)} style={{ fill: 'var(--text-primary)', fontSize: 13, fontWeight: 'bold' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* GRÁFICO 3: Evolução dos Gastos do Ano */}
        <div className="bi-chart-container glass-panel hover-lift fade-in-up" style={{ animationDelay: '0.9s' }}>
          <h3 className="chart-title">Evolução dos Gastos (Últimos Meses)</h3>
          <div style={{ height: 350, width: '100%' }}>
            <ResponsiveContainer>
              <BarChart data={evolucaoAno.slice(Math.max(0, mes - 5), mes + 1)} margin={{ top: 30, right: 30, left: 20, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorEvolucao" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.9}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.4}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.4} />
                <XAxis dataKey="mes" stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis hide />
                <RechartsTooltip cursor={{fill: 'var(--bg-hover)'}} content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bi-tooltip">
                        <p className="title">{label}</p>
                        <div className="row"><span className="dot" style={{background: payload[0].color || payload[0].fill}}/> Total: <b>{formatarMoeda(payload[0].value || 0)}</b></div>
                      </div>
                    );
                  }
                  return null;
                }} />
                <Bar dataKey="valor" radius={[6, 6, 0, 0]} animationDuration={1500} barSize={40}>
                  {evolucaoAno.slice(Math.max(0, mes - 5), mes + 1).map((entry, index) => (
                    <Cell key={\`cell-ev-\${index}\`} fill={entry.isSelected ? '#3b82f6' : 'url(#colorEvolucao)'} style={{ filter: 'drop-shadow(2px 4px 6px rgba(0,0,0,0.1))' }} />
                  ))}
                  <LabelList dataKey="valor" position="top" formatter={(v) => formatarMoeda(v)} style={{ fill: 'var(--text-primary)', fontSize: 12, fontWeight: 'bold' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
      
      `;

content = content.substring(0, startIdx) + newCharts + content.substring(endIdx);
fs.writeFileSync('src/components/DashboardMensal.tsx', content);
console.log('Restored and Fixed.');
