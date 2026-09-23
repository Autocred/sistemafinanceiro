import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCPhj4DYKlu8Q00FmjaA1ofjYUKhRJaK7U",
  authDomain: "sistemafinan.firebaseapp.com",
  projectId: "sistemafinan",
  storageBucket: "sistemafinan.firebasestorage.app",
  messagingSenderId: "1019353725480",
  appId: "1:1019353725480:web:a26ac2d2de24e8358d531d",
  measurementId: "G-RHLXQ3Z7W2"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
    try {
        const tRef = doc(db, 'transacoes', 'msgfygozufnxjy');
        const tSnap = await getDoc(tRef);
        if (!tSnap.exists()) {
            console.log('Transaction not found');
            return;
        }

        const fRef = doc(db, 'faturas', 'msemqbcvznj3wz');
        const fSnap = await getDoc(fRef);
        if (!fSnap.exists()) {
            console.log('Fatura 2026-09 not found');
            return;
        }
        
        const fData = fSnap.data();
        let tIds = fData.transacaoIds || [];
        if (!tIds.includes('msgfygozufnxjy')) {
            tIds.push('msgfygozufnxjy');
        }

        let total = 0;
        for (const tid of tIds) {
            const ts = await getDoc(doc(db, 'transacoes', tid));
            if (ts.exists()) {
                total += Math.abs(ts.data().valor || 0);
            }
        }

        await updateDoc(tRef, { faturaId: 'msemqbcvznj3wz' });
        await updateDoc(fRef, { transacaoIds: tIds, valorTotal: total });
        
        const f10Ref = doc(db, 'faturas', 'msgfynof9zbpes');
        const f10Snap = await getDoc(f10Ref);
        if (f10Snap.exists()) {
            await deleteDoc(f10Ref);
            console.log('Deleted empty 2026-10 fatura');
        }

        console.log('Done!');
        process.exit(0);
    } catch(e) {
        console.error(e);
        process.exit(1);
    }
}
run();
