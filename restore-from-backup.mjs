import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, orderBy } from 'firebase/firestore';
import LZString from 'lz-string';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const firebaseConfig = {
  apiKey: 'AIzaSyCPhj4DYKlu8Q00FmjaA1ofjYUKhRJaK7U',
  authDomain: 'sistemafinan.firebaseapp.com',
  projectId: 'sistemafinan',
  storageBucket: 'sistemafinan.firebasestorage.app',
  messagingSenderId: '1019353725480',
  appId: '1:1019353725480:web:a26ac2d2de24e8358d531d',
};

const TENANT_PREFIX = ''; // master tenant - dados ficam na raiz do Firestore

async function main() {
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  console.log('Buscando backups...');
  const backupsRef = collection(db, `backups_sistema`);
  const backupsSnap = await getDocs(query(backupsRef, orderBy('dataHora', 'desc')));
  
  if (backupsSnap.empty) {
    console.log('NENHUM BACKUP ENCONTRADO!');
    return;
  }
  
  console.log(`Encontrados ${backupsSnap.docs.length} backups:`);
  backupsSnap.docs.forEach((d, i) => {
    const data = d.data();
    console.log(`  ${i+1}. ${data.dataHora} - tipo: ${data.tipo} - registros: ${data.tamanhoRegistros}`);
  });
  
  // Pega o backup mais recente de ontem (30/09/2026)
  const yesterday = '2026-09-30';
  const backupOntem = backupsSnap.docs.find(d => d.data().dataHora?.startsWith(yesterday));
  const backupUsado = backupOntem || backupsSnap.docs[0]; // fallback para o mais recente
  
  console.log('\nUsando backup:', backupUsado.data().dataHora);
  
  const dados = backupUsado.data().dados;
  const isCompressed = backupUsado.data().isCompressed;
  
  let parsed;
  if (isCompressed) {
    const decompressed = LZString.decompressFromUTF16(dados);
    parsed = JSON.parse(decompressed);
  } else {
    parsed = typeof dados === 'string' ? JSON.parse(dados) : dados;
  }
  
  // Extrair transações do Mercado Pago (cartão de crédito)
  const transacoes = parsed.transacoes || [];
  const transMP = transacoes.filter(t => 
    t.cartaoNome === 'Mercado Pago' || 
    t.cartaoId === 'mercadopago_cartao' ||
    (t.formaPagamento === 'cartao_credito' && (t.cartaoNome || '').toLowerCase().includes('mercado'))
  );
  
  console.log(`\n=== TRANSAÇÕES DO MERCADO PAGO NO BACKUP (${transMP.length}) ===`);
  transMP.forEach(t => {
    console.log(`ID: ${t.id}`);
    console.log(`  Descrição: ${t.descricao}`);
    console.log(`  Valor: R$ ${t.valor}`);
    console.log(`  Data: ${t.data || t.dataLancamento}`);
    console.log(`  Status: ${t.status}`);
    console.log(`  FaturaId: ${t.faturaId}`);
    console.log(`  DataVencimento: ${t.dataVencimento}`);
    console.log('---');
  });
  
  // Salvar resultado em JSON para análise
  const fs = require('fs');
  fs.writeFileSync('backup-mp-transacoes.json', JSON.stringify(transMP, null, 2));
  console.log('\nSalvo em backup-mp-transacoes.json');
}

main().catch(console.error);
