async function testar() {
  const API_URL = 'https://evolution-api-production-f941e.up.railway.app';
  const API_TOKEN = 'felipe25';
  const INSTANCE = 'autocred';
  const NUMERO = '5549998266304';

  console.log('Enviando mensagem de teste com formato correto...');
  const res = await fetch(`${API_URL}/message/sendText/${INSTANCE}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apikey': API_TOKEN },
    body: JSON.stringify({
      number: NUMERO,
      text: '✅ Teste do sistema Autocred Finanças! Resumo diário funcionando!',
      options: { delay: 1200, presence: 'composing' }
    })
  });
  const text = await res.text();
  console.log(`Resposta (${res.status}):`, text);
}
testar().catch(console.error);
