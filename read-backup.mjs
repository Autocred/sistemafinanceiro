// Script para ler o backup do Firebase e extrair as transações do cartão Mercado Pago
// Roda localmente com as credenciais do .env

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, orderBy, limit } = require('firebase/firestore');

// Carregar configuração do firebase do projeto
const firebaseConfig = {
  apiKey: "AIzaSyDMvhRFZ9e3qZlZ2GsP8VJ1CpqV3N1HKdE",
  authDomain: "sistemafinanceiropessoal.firebaseapp.com",
  projectId: "sistemafinanceiropessoal",
  storageBucket: "sistemafinanceiropessoal.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};

async function main() {
  // Read the firebase config from the actual project
  const fs = require('fs');
  const firebaseSrc = fs.readFileSync('src/lib/firebase.ts', 'utf8');
  
  // Extract the config values
  const apiKeyMatch = firebaseSrc.match(/apiKey:\s*["']([^"']+)["']/);
  const projectIdMatch = firebaseSrc.match(/projectId:\s*["']([^"']+)["']/);
  const authDomainMatch = firebaseSrc.match(/authDomain:\s*["']([^"']+)["']/);
  const storageBucketMatch = firebaseSrc.match(/storageBucket:\s*["']([^"']+)["']/);
  const messagingSenderIdMatch = firebaseSrc.match(/messagingSenderId:\s*["']([^"']+)["']/);
  const appIdMatch = firebaseSrc.match(/appId:\s*["']([^"']+)["']/);
  
  console.log('Firebase config found:');
  console.log('projectId:', projectIdMatch?.[1]);
  console.log('authDomain:', authDomainMatch?.[1]);
}

main().catch(console.error);
