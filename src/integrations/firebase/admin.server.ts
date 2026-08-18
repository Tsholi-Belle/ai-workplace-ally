import { initializeApp, getApps, getApp, cert, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getStorage, type Storage } from "firebase-admin/storage";

function getAdminApp(): App {
  if (getApps().length > 0) {
    return getApp();
  }

  const serviceAccountJson =
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY || process.env.GCP_SERVICE_ACCOUNT_KEY;
  const projectId =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.GCP_PROJECT_ID ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    "ai-workplace-ally";

  if (serviceAccountJson) {
    try {
      const parsed = JSON.parse(serviceAccountJson);
      return initializeApp({
        credential: cert(parsed),
        projectId: parsed.project_id || projectId,
        storageBucket: `${projectId}.appspot.com`,
      });
    } catch (e) {
      console.warn(
        "[Firebase Admin] Failed to parse service account JSON, falling back to project ID:",
        e,
      );
    }
  }

  // Uses Application Default Credentials (ADC) on Google Cloud Run or project ID in dev
  return initializeApp({
    projectId,
    storageBucket: `${projectId}.appspot.com`,
  });
}

export const adminApp: App = getAdminApp();
export const adminAuth: Auth = getAuth(adminApp);
export const adminDb: Firestore = getFirestore(adminApp);
export const adminStorage: Storage = getStorage(adminApp);
