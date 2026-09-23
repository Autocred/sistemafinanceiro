import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyCPhj4DYKlu8Q00FmjaA1ofjYUKhRJaK7U",
  authDomain: "sistemafinan.firebaseapp.com",
  projectId: "sistemafinan",
  storageBucket: "sistemafinan.firebasestorage.app",
  messagingSenderId: "1019353725480",
  appId: "1:1019353725480:web:a26ac2d2de24e8358d531d",
  measurementId: "G-RHLXQ3Z7W2"
};

async function testCreate() {
  console.log("Inicializando app secundário...");
  const secondaryApp = initializeApp(firebaseConfig, 'SecondaryAuthApp');
  const secondaryAuth = getAuth(secondaryApp);
  
  const email = "teste_interno_xyz@empresa.com";
  const senha = "Equipe@1234";

  console.log("Tentando criar usuário: ", email);
  try {
    const cred = await createUserWithEmailAndPassword(secondaryAuth, email, senha);
    console.log("SUCESSO! UID:", cred.user.uid);
    process.exit(0);
  } catch (err) {
    console.error("FALHA AO CRIAR:", err);
    process.exit(1);
  }
}

testCreate();
