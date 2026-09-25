const fs = require('fs');

function patchConfiguracoes() {
  let content = fs.readFileSync('src/components/Configuracoes.tsx', 'utf8');

  const pinUI = `
              <div className="config-card">
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6', flexShrink: 0 }}>
                    <Key size={22} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
                      Desbloqueio por PIN (4 Dígitos)
                    </h3>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.5 }}>
                      Cadastre uma senha numérica rápida de 4 dígitos para acessar o sistema no celular sem precisar digitar seu e-mail e senha longa. Ideal para quem usa aplicativos sem suporte nativo à biometria.
                    </p>

                    <button
                      type="button"
                      className={pinAtivo ? 'btn-secondary' : 'btn-primary'}
                      onClick={() => {
                        if (pinAtivo) {
                          localStorage.removeItem('app_pin_code');
                          setPinAtivo(false);
                          alert('Desbloqueio por PIN desativado com sucesso!');
                        } else {
                          const novoPin = window.prompt('Digite um PIN de 4 dígitos para desbloqueio rápido:');
                          if (!novoPin) return;
                          if (!/^\\d{4}$/.test(novoPin)) {
                            alert('O PIN deve conter exatamente 4 números!');
                            return;
                          }
                          localStorage.setItem('app_pin_code', novoPin);
                          setPinAtivo(true);
                          alert('PIN ativado! Agora você pode usar esse PIN para desbloquear o sistema rapidamente.');
                        }
                      }}
                    >
                      {pinAtivo ? 'Desativar PIN' : 'Habilitar PIN Agora'}
                    </button>
                    {pinAtivo && <span style={{ marginLeft: 12, fontSize: 12, color: '#22c55e', fontWeight: 600 }}>Ativo neste dispositivo ✓</span>}
                  </div>
                </div>
              </div>
  `;

  if (!content.includes('Desbloqueio por PIN (4 Dígitos)')) {
    // Find where the biometric block ends and append the pinUI
    const bioRegex = /(<h3 style=\{\{ fontSize: 16, fontWeight: 700, color: 'var\(--text-primary\)', marginBottom: 4 \}\}>\s*Desbloqueio por Biometria[\s\S]*?<\/div>\s*<\/div>\s*<\/div>)/;
    
    content = content.replace(bioRegex, `$1\n${pinUI}`);
  }

  fs.writeFileSync('src/components/Configuracoes.tsx', content, 'utf8');
}

patchConfiguracoes();
console.log('Configuracoes repatched');
