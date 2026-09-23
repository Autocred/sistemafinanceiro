const fetch = require('node-fetch');
const API_KEY = "AIzaSyCPhj4DYKlu8Q00FmjaA1ofjYUKhRJaK7U";
async function run() {
  const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:createAuthUri?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identifier: 'clovis@financeai.com',
      continueUri: 'http://localhost'
    })
  });
  const data = await res.json();
  console.log(data);
}
run();
