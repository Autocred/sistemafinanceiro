const fs = require('fs');

let src = fs.readFileSync('src/components/Configuracoes.tsx', 'utf8');

const anchor = 'ativo={cfg.lembretesSinao ?? true}';
const idx = src.indexOf(anchor);

if (idx === -1) {
  console.error('Anchor not found!');
  process.exit(1);
}

// Find the next </SecaoConfig>
const closeSecaoIdx = src.indexOf('</SecaoConfig>', idx);
const endOfSonsIdx = src.indexOf(')}', closeSecaoIdx);

const insertPos = endOfSonsIdx;

const whatsappSection = `
        {/* Notificações por WhatsApp da Licença */}
        <SecaoConfig titulo="Notificações por WhatsApp" icone={<MessageCircle size={18} color="#10b981" />}>
          <ToggleConfig
            label="Receber Notificações Automáticas no WhatsApp"
            descricao="Receba lembretes de contas a pagar e receber pela manhã e o fechamento financeiro à tarde"
            ativo={cfg.whatsappAtivo ?? false}
            onChange={v => setCfg(c => ({ ...c, whatsappAtivo: v }))}
          />
          
          {cfg.whatsappAtivo && (
            <div style={{ background: 'var(--bg-glass)', border: '1px solid var(--border)', borderRadius: 10, padding: 16, marginTop: 12, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
                  📱 Seu Número de WhatsApp (com DDD)
                </label>
                <input
                  className="input-field"
                  placeholder="Ex: 49998266304"
                  value={cfg.whatsappNumeros || ''}
                  onChange={e => setCfg(c => ({ ...c, whatsappNumeros: e.target.value }))}
                />
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Informe o número com DDD que receberá as mensagens.</p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
                    🔔 Horário do Lembrete (Contas a Pagar/Receber)
                  </label>
                  <input
                    type="time"
                    className="input-field"
                    value={cfg.whatsappHorarioLembretes || '08:00'}
                    onChange={e => setCfg(c => ({ ...c, whatsappHorarioLembretes: e.target.value }))}
                  />
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginTop: 4 }}>
                    Lista as contas que vencem hoje e recebimentos previstos.
                  </span>
                </div>

                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
                    📊 Horário do Fechamento Diário
                  </label>
                  <input
                    type="time"
                    className="input-field"
                    value={cfg.whatsappHorarioFechamento || cfg.whatsappHorario || '17:00'}
                    onChange={e => setCfg(c => ({ ...c, whatsappHorarioFechamento: e.target.value, whatsappHorario: e.target.value }))}
                  />
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginTop: 4 }}>
                    Extrato consolidado de receitas, despesas e saldo do dia.
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 6, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={async () => {
                    if (!cfg.whatsappNumeros) {
                      alert('Preencha seu número de WhatsApp primeiro e clique em Salvar Configurações no topo!');
                      return;
                    }
                    try {
                      alert('Disparando teste de Fechamento Diário...');
                      const res = await fetch('/api/cron/fechamento-diario');
                      const json = await res.json();
                      if (json.success) alert('✅ Mensagem de fechamento entregue no seu WhatsApp!');
                      else alert('Resposta: ' + (json.message || json.error));
                    } catch (err: any) {
                      alert('Erro ao disparar: ' + err.message);
                    }
                  }}
                  className="btn-secondary"
                  style={{ fontSize: 12, padding: '8px 14px' }}
                >
                  📊 Testar Fechamento Agora
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    if (!cfg.whatsappNumeros) {
                      alert('Preencha seu número de WhatsApp primeiro e clique em Salvar Configurações no topo!');
                      return;
                    }
                    try {
                      alert('Disparando teste de Lembrete de Contas...');
                      const res = await fetch('/api/cron/lembretes');
                      const json = await res.json();
                      if (json.success) alert('✅ Mensagem de lembrete entregue no seu WhatsApp!');
                      else alert('Resposta: ' + (json.message || json.error));
                    } catch (err: any) {
                      alert('Erro ao disparar: ' + err.message);
                    }
                  }}
                  className="btn-secondary"
                  style={{ fontSize: 12, padding: '8px 14px' }}
                >
                  🔔 Testar Lembrete de Contas Agora
                </button>
              </div>
            </div>
          )}
        </SecaoConfig>
`;

src = src.slice(0, insertPos) + whatsappSection + src.slice(insertPos);
fs.writeFileSync('src/components/Configuracoes.tsx', src);
console.log('✅ Injetado com sucesso dentro de abaAtiva === "sons"!');
