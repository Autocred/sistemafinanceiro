require('dotenv').config({ path: '.env.local' });
const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

try {
  if (getApps().length === 0) {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
      })
    });
  }
} catch(e) {}

const db = getFirestore();

async function fixBalances() {
  console.log("Iniciando correção das licenças...");
  const licencasSnap = await db.collection('admin_master_licencas').get();
  for (const docSnap of licencasSnap.docs) {
    const licenca = docSnap.data();
    const tenantId = docSnap.id;
    console.log(`Corrigindo tenant: ${tenantId} (${licenca.nomeFantasia || 'Sem nome'})`);
    
    // Corrigir contas bancárias para saldo 0
    const contasSnap = await db.collection(`tenants/${tenantId}/contas`).get();
    for (const contaDoc of contasSnap.docs) {
      await contaDoc.ref.update({ saldo: 0 });
      console.log(`  Conta ${contaDoc.id} zerada.`);
    }

    // Atualizar o nome do admin
    const usersSnap = await db.collection(`tenants/${tenantId}/users`).where('role', '==', 'admin').get();
    for (const userDoc of usersSnap.docs) {
      const userData = userDoc.data();
      if (licenca.nomeFantasia && (userData.nome === 'Usuário' || userData.nome.startsWith('Administrador') || userData.nome === 'Admin')) {
        await userDoc.ref.update({ nome: licenca.nomeFantasia });
        console.log(`  Admin name updated to ${licenca.nomeFantasia}`);
      }
    }
  }
  console.log("Concluído!");
}

fixBalances().catch(console.error);
