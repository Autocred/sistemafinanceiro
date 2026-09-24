import fs from 'fs';
let c = fs.readFileSync('src/components/MetasGamificadasV2.tsx', 'utf8');

const insightCode = `
          {/* Insights IA */}
          <div style={{ marginTop: 24, padding: 20, background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(59, 130, 246, 0.15) 100%)', borderRadius: 12, border: '1px solid rgba(139, 92, 246, 0.3)', display: 'flex', gap: 16 }}>
            <div style={{ background: 'rgba(139, 92, 246, 0.2)', padding: 12, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Wand2 size={24} color="#a78bfa" />
            </div>
            <div>
              <h4 style={{ margin: '0 0 8px 0', fontSize: 14, fontWeight: 800, color: '#c4b5fd' }}>Insight Inteligente</h4>
              <p style={{ margin: 0, fontSize: 13, color: '#e2e8f0', lineHeight: 1.5 }}>
                {variacao >= 0 ? (
                  <>Com base na sua média de <strong style={{ color: '#fff' }}>{formatarMoeda(mediaDiariaRealizada)}/dia</strong>, a inteligência artificial projeta que você superará a meta! Você fechará o mês com <strong style={{ color: '#10b981' }}>{formatarMoeda(variacao)} acima</strong> do alvo. Mantenha o excelente ritmo nos próximos {diasUteisRestantes} dias úteis!</>
                ) : (
                  <>Sua projeção de fechamento está <strong style={{ color: '#ef4444' }}>{formatarMoeda(Math.abs(variacao))} abaixo</strong> da meta. Para reverter isso e atingir o alvo, você precisará faturar uma média de <strong style={{ color: '#fbbf24' }}>{formatarMoeda(metaDiariaAjustada)}</strong> em cada um dos {diasUteisRestantes} dias úteis restantes. Foco nas vendas!</>
                )}
              </p>
            </div>
          </div>
`;

// Insert after the grid of 3 before the chart
const splitTag = `{/* Gráfico */}`;
const parts = c.split(splitTag);
if (parts.length === 2) {
  fs.writeFileSync('src/components/MetasGamificadasV2.tsx', parts[0] + insightCode + '\n          ' + splitTag + parts[1]);
  console.log('Added Insights!');
}
