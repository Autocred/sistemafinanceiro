/**
 * backupFirestore.js
 * Simple script to export all Firestore collections to JSON files.
 * Usage: `node scripts/backupFirestore.js`
 */
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Load service account key from environment variable or file
// Expect GOOGLE_APPLICATION_CREDENTIALS to be set in Vercel env.
admin.initializeApp({
  credential: admin.credential.applicationDefault()
});

const db = admin.firestore();

async function exportCollection(colName) {
  const snapshot = await db.collection(colName).get();
  const docs = [];
  snapshot.forEach(doc => {
    docs.push({ id: doc.id, ...doc.data() });
  });
  const outPath = path.join(__dirname, `${colName}.json`);
  fs.writeFileSync(outPath, JSON.stringify(docs, null, 2));
  console.log(`Exported ${colName} → ${outPath}`);
}

async function main() {
  const collections = await db.listCollections();
  for (const col of collections) {
    await exportCollection(col.id);
  }
  console.log('Firestore backup completed.');
}

main().catch(err => {
  console.error('Backup failed:', err);
  process.exit(1);
});
