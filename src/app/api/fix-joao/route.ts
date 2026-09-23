import { NextResponse } from 'next/server';
import { getDb } from '@/lib/firebase';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';

export async function GET(request: Request) {
  try {
    const db = getDb();
    const usersSnap = await getDocs(collection(db, 'users'));
    const logs: string[] = [];

    for (const userDoc of usersSnap.docs) {
      const userData = userDoc.data();
      logs.push(`${userData.email} | ${userData.role} | ${userData.status}`);
      // Se tiver requirePasswordChange pendente a gente já aprova também pra testar
      if (userData.status !== 'aprovado' || !userData.status) {
        await updateDoc(doc(db, 'users', userDoc.id), { status: 'aprovado' });
        logs.push(`-> STATUS CORRIGIDO PARA APROVADO`);
      }
    }
    return NextResponse.json({ success: true, logs });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message });
  }
}
