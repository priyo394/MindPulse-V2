import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// ডিবাগ করার জন্য এই লাইনটি যোগ করুন (দেখার জন্য যে API key ঠিকমতো পাচ্ছে কি না)
console.log("Firebase API Key:", firebaseConfig.apiKey);
console.log("Firebase Auth Domain:", firebaseConfig.authDomain);
console.log("Firebase Project Id:", firebaseConfig.projectId);
console.log("Firebase Storage Bucket:", firebaseConfig.storageBucket);
console.log("Firebase Messaging Sender Id:", firebaseConfig.messagingSenderId);
console.log("Firebase App Id:", firebaseConfig.appId);

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };