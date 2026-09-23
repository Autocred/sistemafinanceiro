import { getDb } from '../src/lib/firebase';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';

async function fixBalances() {
  console.log("Iniciando correção das licenças...");
  const db = getDb();
  const licencasSnap = await getDocs(collection(db, 'admin_master_licencas'));
  for (const docSnap of licencasSnap.docs) {
    const licenca = docSnap.data();
    const tenantId = docSnap.id;
    console.log(`Corrigindo tenant: ${tenantId} (${licenca.nomeFantasia || 'Sem nome'})`);
    
    // Corrigir contas bancárias para saldo 0
    const contasSnap = await getDocs(collection(db, `tenants/${tenantId}/contas`));
    for (const contaDoc of contasSnap.docs) {
      await updateDoc(doc(db, `tenants/${tenantId}/contas`, contaDoc.id), { saldo: 0 });
      console.log(`  Conta ${contaDoc.id} zerada.`);
    }

    // Atualizar o nome do admin
    const usersSnap = await getDocs(collection(db, `tenants/${tenantId}/users`));
    for (const userDoc of usersSnap.docs) {
      const userData = userDoc.data();
      if (userData.role === 'admin' && licenca.nomeFantasia && (userData.nome === 'Usuário' || userData.nome.startsWith('Administrador') || userData.nome === 'Admin')) {
        await updateDoc(doc(db, `tenants/${tenantId}/users`, userDoc.id), { nome: licenca.nomeFantasia });
        console.log(`  Admin name updated to ${licenca.nomeFantasia}`);
      }
    }
  }
  console.log("Concluído!");
}

fixBalances().catch(console.error);
