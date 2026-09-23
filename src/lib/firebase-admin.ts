import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

if (!getApps().length) {
  try {
    const projectId = process.env.FIREBASE_PROJECT_ID || 'sistemafinan';
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    // Replace literal '\n' with actual newlines in private key
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (clientEmail && privateKey) {
      initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
      console.log('Firebase Admin initialized with provided credentials.');
    } else {
      // Tenta inicializar com credenciais padrão do ambiente (Google Cloud / Vercel ADC)
      initializeApp({ projectId });
      console.log('Firebase Admin initialized with default application credentials.');
    }
  } catch (error) {
    console.error('Firebase Admin initialization error', error);
  }
}

const adminDb = getApps().length ? getFirestore() : null;

export { adminDb };
