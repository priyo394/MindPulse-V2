import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

function getAdminDb() {
  if (!getApps().length) {
    let privateKey = process.env.FIREBASE_PRIVATE_KEY || "";

    // শুরু ও শেষের ডাবল কোটেশন থাকলে রিমোভ করা
    privateKey = privateKey.replace(/^"|"$/g, '').trim();

    // যদি কি-টি Base64 এনকোডেড থাকে, তবে ডিকোড করা
    if (!privateKey.includes("-----BEGIN PRIVATE KEY-----")) {
      try {
        privateKey = Buffer.from(privateKey, 'base64').toString('utf8');
      } catch (e) {
        // Ignore
      }
    }

    // ব্যাকস্ল্যাশ n কে আসল নিউলাইনে কনভার্ট করা
    const formattedPrivateKey = privateKey.replace(/\\n/g, '\n');

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