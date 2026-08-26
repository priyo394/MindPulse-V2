import admin from "firebase-admin";

const firebaseAdmin = admin as unknown as {
  apps: any[];
  initializeApp: (options: any) => any;
  credential: {
    cert: (serviceAccount: any) => any;
  };
  firestore: () => any;
};

if (!firebaseAdmin.apps.length) {
  if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) {
    throw new Error("Missing Firebase Admin Environment Variables");
  }

  firebaseAdmin.initializeApp({
    credential: firebaseAdmin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
  });
}

export const adminDb = firebaseAdmin.firestore();