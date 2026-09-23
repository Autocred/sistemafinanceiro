require('dotenv').config({ path: '.env.local' });
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, updateDoc } = require('firebase/firestore');

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

const app = initializeApp(config);
const db = getFirestore(app);
const CARTAO_COLLECTION = '31ddc194-d79a-4de4-bd95-cdcbfdf19bc5_cartoes';

async function main() {
  const snap = await getDocs(collection(db, CARTAO_COLLECTION));
  snap.forEach(async (d) => {
    console.log("Cartão encontrado:", d.id, d.data().nome);
    if (d.data().nome === 'Mercado Pago') {
       console.log("Atualizando Mercado Pago...");
       await updateDoc(doc(db, CARTAO_COLLECTION, d.id), {
          limite: 1700,
          limiteDisponivel: 904.22
       });
       console.log("Limites atualizados: limite 1700, disponivel 904.22");
    }
  });
}
main().catch(console.error);
