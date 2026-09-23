import { NextResponse } from 'next/server';
import { getFirebaseApp, getDb } from '@/lib/firebase';
import { collection, query, getDocs, limit, where } from 'firebase/firestore';

export async function GET(request: Request) {
  try {
    const db = getDb();
    const transQ = query(collection(db, 'users', '81iIpsfH5FfL1R4GjW7h44wV4fF3', 'transacoes'), limit(5));
    const transSnap = await getDocs(transQ);
    
    // Oh wait, I don't know which user it is. 
    // Let's just find any transaction that has 115.9 value across all users
    
    const usersSnap = await getDocs(collection(db, 'users'));
    const allFound: any[] = [];
    
    for (const userDoc of usersSnap.docs) {
      const userId = userDoc.id;
      const tQ = query(collection(db, 'users', userId, 'transacoes'));
      const tSnap = await getDocs(tQ);
      
      const transacoes = tSnap.docs.map(d => ({ id: d.id, ...d.data() as any }));
      
      // Let's search by something we know: "ATRASADO" or "18/08/2026" or "Internet AP"
      // the date is "2026-08-18" or "18/08/2026"
      const found = transacoes.filter(t => t.dataVencimento === '2026-08-18' || t.data === '2026-08-18' || JSON.stringify(t).includes('Internet'));
      allFound.push(...found);
    }
    
    return NextResponse.json({ success: true, countFound: allFound.length, items: allFound.slice(0, 10) });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
