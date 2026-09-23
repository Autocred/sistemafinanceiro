import { getDb } from '../src/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

async function checkTenant() {
  const db = getDb();
  const tenantId = 'msjdfuf1ytcy4m';
  
  const transSnap = await getDocs(collection(db, `tenants/${tenantId}/transacoes`));
  console.log(`Transações: ${transSnap.size}`);
  
  const contasSnap = await getDocs(collection(db, `tenants/${tenantId}/contas`));
  console.log(`Contas: ${contasSnap.size}`);
  contasSnap.forEach(c => console.log(c.id, c.data().saldo));
}

checkTenant().catch(console.error);
