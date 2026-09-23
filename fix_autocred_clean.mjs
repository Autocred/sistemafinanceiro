import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, updateDoc, doc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCPhj4DYKlu8Q00FmjaA1ofjYUKhRJaK7U",
  authDomain: "sistemafinan.firebaseapp.com",
  projectId: "sistemafinan",
  storageBucket: "sistemafinan.firebasestorage.app",
  messagingSenderId: "1019353725480",
  appId: "1:1019353725480:web:a26ac2d2de24e8358d531d"
};

async function fix() {
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  console.log("=== CORRIGINDO TRANSFERENCIAS AUTOCRED ===");
  const tenantId = "autocred-promotora-de-credito";
  
  const contasSnap = await getDocs(collection(db, "tenants/" + tenantId + "/contas"));
  let carteiraId = null;
  let carteiraNome = "Carteira dinheiro";
  
  for(const c of contasSnap.docs) {
     if (c.data().nome.toLowerCase().includes("carteira")) {
         carteiraId = c.id;
         carteiraNome = c.data().nome;
         break;
     }
  }

  const transSnap = await getDocs(collection(db, "tenants/" + tenantId + "/transacoes"));
  let fixedCount = 0;
  
  for (const d of transSnap.docs) {
    const t = d.data();
    if (t.tipo === "transferencia") {
        const jsonStr = JSON.stringify(t).toLowerCase();
        if (jsonStr.includes("santander")) {
            console.log("Found:", JSON.stringify(t, null, 2));
            
            let count = 0;
            for (let key in t) {
                if (typeof t[key] === "string" && t[key].toLowerCase().includes("santander")) {
                    count++;
                }
            }
            if (count >= 2 || jsonStr.includes("->") || jsonStr.includes("➔")) {
                console.log("UPDATING!");
                let updateData = {};
                for (let key in t) {
                    if (key.includes("Destin")) {
                        if (key.endsWith("Id")) updateData[key] = carteiraId || t[key];
                        if (key.endsWith("Nome")) updateData[key] = carteiraNome;
                    }
                }
                
                await updateDoc(doc(db, "tenants/" + tenantId + "/transacoes", d.id), updateData);
                console.log("UPDATED TO CARTEIRA");
                fixedCount++;
            }
        }
    }
  }
  console.log("Total fixed:", fixedCount);
  process.exit(0);
}
fix();
