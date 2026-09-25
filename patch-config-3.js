const fs = require('fs');

function patchConfiguracoes() {
  let content = fs.readFileSync('src/components/Configuracoes.tsx', 'utf8');

  const pinUI = `
             </div>
             
             <div style={{ marginTop: 24, paddingTop: 24, borderTop: '1px solid var(--border)' }}>
             <label style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Key size={16} color="#3b82f6" />
                Desbloqueio por PIN (4 Dígitos)
             </label>
             <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
                Cadastre uma senha numérica rápida de 4 dígitos para acessar o sistema no celular sem precisar digitar seu e-mail e senha longa. Ideal para aplicativos (APK) sem suporte a biometria nativa.
             </p>
             <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button
                   className={pinAtivo ? 'btn-secondary' : 'btn-primary'}
                   onClick={() => {
                      if (pinAtivo) {
                         localStorage.removeItem('app_pin_code');
                         setPinAtivo(false);
                         alert("Desbloqueio por PIN desativado com sucesso!");
                      } else {
                         const novoPin = window.prompt("Digite um PIN de 4 dígitos para desbloqueio rápido:");
                         if (!novoPin) return;
                         if (!/^\\d{4}$/.test(novoPin)) {
                            alert("O PIN deve conter exatamente 4 números!");
                            return;
                         }
                         localStorage.setItem('app_pin_code', novoPin);
                         setPinAtivo(true);
                         alert("PIN ativado! Agora você pode usar esse PIN para desbloquear o sistema rapidamente.");
                      }
                   }}
                >
                   {pinAtivo ? 'Desativar PIN' : 'Habilitar PIN Agora'}
                </button>
                {pinAtivo && <span style={{ fontSize: 12, color: '#22c55e', fontWeight: 600 }}>Ativo neste dispositivo ✓</span>}
             </div>
  `;

  if (!content.includes('Desbloqueio por PIN (4 Dígitos)')) {
    content = content.replace(
      "{biometriaAtiva && <span style={{ fontSize: 12, color: '#22c55e', fontWeight: 600 }}>Ativo neste dispositivo S </span>}\n             </div>",
      "{biometriaAtiva && <span style={{ fontSize: 12, color: '#22c55e', fontWeight: 600 }}>Ativo neste dispositivo ✓</span>}\n" + pinUI
    );
  }

  fs.writeFileSync('src/components/Configuracoes.tsx', content, 'utf8');
}

patchConfiguracoes();
console.log('Configuracoes repatched again');
