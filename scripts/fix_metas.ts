import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { firebaseConfig } from '../src/lib/firebase';
(global as any).window = {};
import { getCollectionPath } from '../src/lib/storage';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function check() {
  const ref = doc(db, getCollectionPath('configuracoes_metas'), 'metas');
  const snap = await getDoc(ref);
  if (snap.exists()) {
    console.log("Firebase data:", JSON.stringify(snap.data(), null, 2));
  } else {
    console.log("No data found at path:", ref.path);
  }
  process.exit(0);
}

check().catch(console.error);
