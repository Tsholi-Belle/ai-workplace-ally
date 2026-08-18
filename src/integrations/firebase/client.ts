import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDummyKeyForDevelopment123456",
  authDomain:
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ||
    `${import.meta.env.VITE_FIREBASE_PROJECT_ID || "ai-workplace-ally"}.firebaseapp.com`,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "ai-workplace-ally",
  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ||
    `${import.meta.env.VITE_FIREBASE_PROJECT_ID || "ai-workplace-ally"}.appspot.com`,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "1234567890",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:1234567890:web:abcdef123456",
};

function getFirebaseClientApp(): FirebaseApp {
  if (getApps().length > 0) {
    return getApp();
  }
  return initializeApp(firebaseConfig);
}

export const app: FirebaseApp = getFirebaseClientApp();
export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);
export const storage: FirebaseStorage = getStorage(app);
