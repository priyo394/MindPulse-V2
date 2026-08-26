import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

function getAdminDb() {
  if (!getApps().length) {
    let rawPrivateKey = process.env.FIREBASE_PRIVATE_KEY || "";
    rawPrivateKey = rawPrivateKey.replace(/^"|"$/g, '');
    const formattedPrivateKey = rawPrivateKey.split('\\n').join('\n');

    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: formattedPrivateKey,
      }),
    });
  }
  return getFirestore();
}

export const adminDb = new Proxy({} as FirebaseFirestore.Firestore, {
  get(target, prop) {
    const db = getAdminDb();
    const value = (db as any)[prop];
    return typeof value === 'function' ? value.bind(db) : value;
  }
});