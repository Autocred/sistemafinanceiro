const fs = require('fs');
const https = require('https');
const path = require('path');

const token = 'nfc_Ynr3QD5XCJ9acL7s1zfjRRpXVVKb4bJu0054';
const siteId = '0740f73d-b950-4ee4-afea-d771d59509cb';
const zipPath = path.join(__dirname, 'atualizacao_finangrando.zip');

if (!fs.existsSync(zipPath)) {
  console.error('Zip file not found!');
  process.exit(1);
}

const stats = fs.statSync(zipPath);

const options = {
  hostname: 'api.netlify.com',
  port: 443,
  path: `/api/v1/sites/${siteId}/deploys`,
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/zip',
    'Content-Length': stats.size
  }
};

const req = https.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  res.setEncoding('utf8');
  res.on('data', (chunk) => {
    console.log(`BODY: ${chunk}`);
  });
  res.on('end', () => {
    console.log('Deploy requested!');
  });
});

req.on('error', (e) => {
  console.error(`problem with request: ${e.message}`);
});

const readStream = fs.createReadStream(zipPath);
readStream.pipe(req);
