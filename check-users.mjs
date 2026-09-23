import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, setDoc, doc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCPhj4DYKlu8Q00FmjaA1ofjYUKhRJaK7U",
  authDomain: "sistemafinan.firebaseapp.com",
  projectId: "sistemafinan",
  storageBucket: "sistemafinan.firebasestorage.app",
  messagingSenderId: "1019353725480",
  appId: "1:1019353725480:web:a26ac2d2de24e8358d531d"
};

async function checkUsers() {
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  
  const snap = await getDocs(collection(db, 'users'));
  console.log(`Found ${snap.size} users.`);
  snap.forEach(d => {
    console.log(d.id, "=>", d.data());
  });
  
  process.exit(0);
}

checkUsers();
