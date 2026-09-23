import { initializeApp } from 'firebase/app';
import { getFirestore, setDoc, doc, getDocs, collection, query, where } from 'firebase/firestore';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyCPhj4DYKlu8Q00FmjaA1ofjYUKhRJaK7U",
  authDomain: "sistemafinan.firebaseapp.com",
  projectId: "sistemafinan",
  storageBucket: "sistemafinan.firebasestorage.app",
  messagingSenderId: "1019353725480",
  appId: "1:1019353725480:web:a26ac2d2de24e8358d531d"
};

async function createTestUser() {
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  const auth = getAuth(app);

  const masterUid = "9yxuafoC0AV9BrIKem05ponbmgn2";
  const tenantId = masterUid;

  // 1. Ensure master has tenantId
  console.log("1. Fixing master tenantId...");
  await setDoc(doc(db, 'users', masterUid), { tenantId: tenantId }, { merge: true });
  console.log("   Done.");

  // 2. Create a real test user
  const testEmail = "equipe.teste@financeai.com";
  const testSenha = "Equipe@2026";
  const testNome = "Colaborador Teste";

  console.log("2. Creating test user in Firebase Auth...");
  let newUid;
  try {
    const cred = await createUserWithEmailAndPassword(auth, testEmail, testSenha);
    newUid = cred.user.uid;
    console.log("   User created with UID:", newUid);
    await signOut(auth);
  } catch (err) {
    if (err.code === 'auth/email-already-in-use') {
      console.log("   User already exists in Auth. Checking Firestore...");
      // Find the existing uid from Firestore
      const snap = await getDocs(query(collection(db, 'users'), where('email', '==', testEmail)));
      if (!snap.empty) {
        newUid = snap.docs[0].id;
        console.log("   Found existing UID:", newUid);
      } else {
        console.log("   Email exists in Auth but not in Firestore. Will write with placeholder UID.");
        newUid = "test_equipe_user_manual";
      }
    } else {
      throw err;
    }
  }

  // 3. Write user to Firestore with the master's tenantId
  console.log("3. Writing user to Firestore...");
  await setDoc(doc(db, 'users', newUid), {
    uid: newUid,
    nome: testNome,
    email: testEmail,
    status: 'aprovado',
    role: 'user',
    tenantId: tenantId,
    permissoes: {
      dashboard_ver: true,
      lancamentos_ver_proprios: true,
      lancamentos_criar: true,
      cadastros_ver: true,
      calendario_ver: true
    },
    createdAt: new Date().toISOString()
  });
  console.log("   Done! User saved in Firestore.");

  // 4. Verify
  console.log("\n4. Verifying team members with tenantId =", tenantId);
  const teamSnap = await getDocs(query(collection(db, 'users'), where('tenantId', '==', tenantId)));
  console.log("   Found", teamSnap.size, "team members:");
  teamSnap.forEach(d => {
    const data = d.data();
    console.log("   -", data.nome, "|", data.email, "|", data.role, "|", data.status);
  });

  console.log("\n✅ TUDO PRONTO!");
  console.log("   Email: " + testEmail);
  console.log("   Senha: " + testSenha);
  console.log("   Este usuário deve aparecer na lista de 'Minha Equipe' do master.");

  process.exit(0);
}

createTestUser().catch(err => {
  console.error("FATAL:", err);
  process.exit(1);
});
