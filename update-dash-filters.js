const fs = require('fs');
let content = fs.readFileSync('src/components/DashboardMensal.tsx', 'utf-8');

// Replace Imports
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
} from 'lucide-react';`);

// Replace States
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
  }, [transacoes]);`);

// Replace txMes
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
  }, [transacoes, ano, mes, statusFiltro, categoriaFiltro, centroCustoFiltro]);`);

// Replace Filters HTML
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
        </div>`);

fs.writeFileSync('src/components/DashboardMensal.tsx', content);
console.log('Script 1 done');
