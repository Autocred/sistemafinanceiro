import { NextResponse } from 'next/server';
import { getDb } from '@/lib/firebase';
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';

export async function GET() {
  try {
    const metasRef = collection(getDb(), 'empresas', 'autocred', 'metas_financeiras');
    const snap = await getDocs(metasRef);
    let count = 0;
    
    for (const d of snap.docs) {
      const data = d.data();
      if (data.valorAlvo === 40) {
        await setDoc(doc(getDb(), 'empresas', 'autocred', 'metas_financeiras', d.id), { valorAlvo: 40000 }, { merge: true });
        count++;
      } else if (data.valorAlvo < 1000) {
        await setDoc(doc(getDb(), 'empresas', 'autocred', 'metas_financeiras', d.id), { valorAlvo: data.valorAlvo * 1000 }, { merge: true });
        count++;
      }
    }
    return NextResponse.json({ success: true, count });
  } catch (err: any) {
    return NextResponse.json({ error: err.message });
  }
}
