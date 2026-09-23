import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const projectId = "sistemafinan";
initializeApp({ projectId });

async function check() {
  try {
    const auth = getAuth();
    const user = await auth.getUserByEmail('joaofelipe@financeai.app');
    console.log("USER FOUND IN AUTH:", user.uid, user.email);
  } catch(e: any) {
    console.error("AUTH ERROR:", e.message);
  }
  
  try {
    const db = getFirestore();
    const snap = await db.collection('users').where('email', '==', 'joaofelipe@financeai.app').get();
    if (snap.empty) {
      console.log("NO FIRESTORE USER FOUND");
    } else {
      snap.forEach(doc => console.log("FIRESTORE USER:", doc.id, doc.data()));
    }
  } catch(e: any) {
    console.error("FIRESTORE ERROR:", e.message);
  }
}
check();
