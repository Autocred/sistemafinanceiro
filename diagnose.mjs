import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCPhj4DYKlu8Q00FmjaA1ofjYUKhRJaK7U",
  authDomain: "sistemafinan.firebaseapp.com",
  projectId: "sistemafinan",
  storageBucket: "sistemafinan.firebasestorage.app",
  messagingSenderId: "1019353725480",
  appId: "1:1019353725480:web:a26ac2d2de24e8358d531d"
};

async function diagnose() {
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  console.log("=== DIAGNÓSTICO COMPLETO ===\n");

  // 1. Listar TODOS os usuários e seus campos
  console.log("1. TODOS os documentos na coleção 'users':");
  const allSnap = await getDocs(collection(db, 'users'));
  allSnap.forEach(d => {
    const data = d.data();
    console.log(`   DocID: ${d.id}`);
    console.log(`   Fields:`, JSON.stringify(data, null, 2));
    console.log('');
  });

  // 2. Testar query por tenantId
  const masterUid = "9yxuafoC0AV9BrIKem05ponbmgn2";
  console.log(`\n2. Query where tenantId == '${masterUid}':`);
  const q1 = query(collection(db, 'users'), where('tenantId', '==', masterUid));
  const snap1 = await getDocs(q1);
  console.log(`   Encontrados: ${snap1.size}`);
  snap1.forEach(d => {
    console.log(`   - ${d.data().nome} | ${d.data().email} | tenantId: ${d.data().tenantId}`);
  });

  // 3. Testar query por uid
  console.log(`\n3. Query where uid == '${masterUid}':`);
  const q2 = query(collection(db, 'users'), where('uid', '==', masterUid));
  const snap2 = await getDocs(q2);
  console.log(`   Encontrados: ${snap2.size}`);
  snap2.forEach(d => {
    console.log(`   - ${d.data().nome} | tenantId: ${d.data().tenantId}`);
  });

  // 4. Testar getDoc direto pelo ID
  console.log(`\n4. getDoc direto users/${masterUid}:`);
  const directDoc = await getDoc(doc(db, 'users', masterUid));
  if (directDoc.exists()) {
    console.log(`   Existe! Data:`, JSON.stringify(directDoc.data(), null, 2));
  } else {
    console.log(`   NÃO EXISTE!`);
  }

  // 5. Verificar se tem dados em tenant path
  console.log(`\n5. Checando tenants/${masterUid}/users:`);
  try {
    const tenantSnap = await getDocs(collection(db, `tenants/${masterUid}/users`));
    console.log(`   Encontrados: ${tenantSnap.size}`);
  } catch(e) {
    console.log(`   Erro:`, e.message);
  }

  process.exit(0);
}

diagnose();
