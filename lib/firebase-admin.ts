import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

if (!getApps().length) {
  if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) {
    throw new Error("Missing Firebase Admin Environment Variables");
  }

  // Vercel-এর জন্য প্রাইভেট কি ঠিক করা (ডাবল কোটেশন বাদ দেওয়া এবং নিউলাইন ফিক্স করা)
  let formatPrivateKey = process.env.FIREBASE_PRIVATE_KEY;
  formatPrivateKey = formatPrivateKey.replace(/"/g, '').replace(/\\n/g, '\n');

  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: formatPrivateKey,
    }),
  });
}

export const adminDb = getFirestore();