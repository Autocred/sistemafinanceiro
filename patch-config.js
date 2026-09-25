const fs = require('fs');

function patchConfiguracoes() {
  let content = fs.readFileSync('src/components/Configuracoes.tsx', 'utf8');

  // Add PIN state
  if (!content.includes('const [pinAtivo, setPinAtivo]')) {
    content = content.replace(
      'const [biometriaAtiva, setBiometriaAtiva] = useState<boolean>(false);',
      `const [biometriaAtiva, setBiometriaAtiva] = useState<boolean>(false);
  const [pinAtivo, setPinAtivo] = useState<boolean>(false);`
    );
  }

  if (!content.includes('setPinAtivo(!!localStorage.getItem')) {
    content = content.replace(
      'setBiometriaAtiva(isBiometriaHabilitada());',
      `setBiometriaAtiva(isBiometriaHabilitada());
      setPinAtivo(!!localStorage.getItem('app_pin_code'));`
    );
  }

  // Add PIN UI
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
    content = content.replace(
      '{/* SEGURANÇA E ACESSO */}',
      `{/* SEGURANÇA E ACESSO */}\n${pinUI}`
    );
  }

  // Ensure Key is imported from lucide-react
  if (!content.includes('Key,')) {
    content = content.replace('Fingerprint, ', 'Fingerprint, Key, ');
  }

  fs.writeFileSync('src/components/Configuracoes.tsx', content, 'utf8');
}

patchConfiguracoes();
console.log('Configuracoes patched');
