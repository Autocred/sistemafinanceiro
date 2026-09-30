const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');

if (getApps().length === 0) {
    initializeApp({
        credential: cert(require('./service-account.json'))
    });
}
const db = getFirestore();

async function run() {
    try {
        const DATA_COLLECTIONS = [
          'transacoes', 'categorias', 'centrosCusto', 'fornecedores', 
          'clientes', 'contas', 'cartoes', 'faturas', 
          'financial_movements', 'alertas', 'historicoIA'
        ];
        const tenantId = 'master'; // or '9yxuafoC0AV9BrIKem05ponbmgn2'
        const getCollectionPath = (col) => col; // For master

        const backupData = {};
        let total = 0;
        for (const col of DATA_COLLECTIONS) {
            const snap = await db.collection(getCollectionPath(col)).get();
            backupData[col] = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            total += snap.docs.length;
            console.log(col, snap.docs.length);
        }

        const payload = JSON.stringify(backupData);
        console.log('Payload size (bytes):', Buffer.byteLength(payload, 'utf8'));
        console.log('Total:', total);
    } catch (e) {
        console.error(e);
    }
}
run();
