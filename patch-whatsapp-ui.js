const fs = require('fs');
let src = fs.readFileSync('src/app/master/whatsapp/page.tsx', 'utf8');

// 1. Add state for horario
src = src.replace("const [numeroMaster, setNumeroMaster] = useState('');", "const [numeroMaster, setNumeroMaster] = useState('');\n  const [horario, setHorario] = useState('23:00');");

// 2. Load horario and check connection state on mount
src = src.replace("if (data.whatsappNumeroMaster) setNumeroMaster(data.whatsappNumeroMaster);", `if (data.whatsappNumeroMaster) setNumeroMaster(data.whatsappNumeroMaster);
          if (data.whatsappHorario) setHorario(data.whatsappHorario);

          if (data.whatsappApiUrl && data.whatsappApiToken) {
            fetch(\`\${data.whatsappApiUrl}/instance/connectionState/autocred\`, { headers: { apikey: data.whatsappApiToken } })
              .then(r => r.json())
              .then(d => { if (d?.instance?.state === 'open' || d?.state === 'open') setStatus('connected'); })
              .catch(() => {});
          }`);

// 3. Save horario to firebase
src = src.replace("whatsappNumeroMaster: numeroMaster,", "whatsappNumeroMaster: numeroMaster,\n        whatsappHorario: horario,");

// 4. Add dropdown to UI
const dropdownHtml = `
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Horário do Fechamento Diário</label>
            <select 
              value={horario}
              onChange={e => setHorario(e.target.value)}
              style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-title)' }}
            >
              <option value="18:00">18:00</option>
              <option value="19:00">19:00</option>
              <option value="20:00">20:00</option>
              <option value="21:00">21:00</option>
              <option value="22:00">22:00</option>
              <option value="23:00">23:00</option>
              <option value="08:00">08:00 (dia seguinte)</option>
            </select>
          </div>
`;

src = src.replace("<div style={{ gridColumn: '1 / -1' }}>", dropdownHtml + "\n          <div style={{ gridColumn: '1 / -1' }}>");

fs.writeFileSync('src/app/master/whatsapp/page.tsx', src);
