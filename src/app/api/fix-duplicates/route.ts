import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

function normalizarTexto(texto: string) {
  if (!texto) return '';
  let t = texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  if (t.endsWith('s')) t = t.slice(0, -1);
  return t;
}

export async function GET() {
  try {
    const db = adminDb!;
    let totalRemovidos = 0;
    
    // Obter todos os tenants
    const licencasSnap = await db.collection('admin_master_licencas').get();
    const tenants = licencasSnap.docs.map(d => d.id);
    tenants.push('master');

    for (const tenant of tenants) {
      const getPath = (col: string) => tenant === 'master' ? col : `tenants/${tenant}/${col}`;
      
      const colecoes = ['categorias', 'centrosCusto', 'fornecedores', 'clientes'];
      
      for (const col of colecoes) {
        const snap = await db.collection(getPath(col)).get();
        if (snap.empty) continue;
        
        const vistos = new Map<string, string>(); // nomeNormalizado -> id
        
        for (const doc of snap.docs) {
          const data = doc.data();
          const nomeOriginal = data.nome || data.razaoSocial || '';
          if (!nomeOriginal) continue;
          
          const norm = normalizarTexto(nomeOriginal);
          
          if (vistos.has(norm)) {
            // É duplicado, vamos apagar
            console.log(`Deletando duplicado: ${nomeOriginal} (Tenant: ${tenant})`);
            await db.collection(getPath(col)).doc(doc.id).delete();
            totalRemovidos++;
          } else {
            vistos.set(norm, doc.id);
          }
        }
      }
    }
    
    return NextResponse.json({ ok: true, removidos: totalRemovidos });
  } catch(e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
