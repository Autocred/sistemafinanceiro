async function testar() {
  const API_URL = 'https://evolution-api-production-f941e.up.railway.app';
  const API_TOKEN = 'felipe25';
  const INSTANCE = 'autocred';
  const NUMERO = '5549998266304';

  console.log('Testando Evolution API v2...');
  try {
    const res = await fetch(`${API_URL}/message/sendText/${INSTANCE}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': API_TOKEN },
      body: JSON.stringify({
        number: NUMERO,
        options: { delay: 1200, presence: 'composing' },
        text: "Teste Evolution API v2.3.7"
      })
    });
    
    console.log(`Resposta (${res.status}):`);
    const text = await res.text();
    console.log(text);
  } catch(e) {
    console.error(e);
  }
}
testar();
