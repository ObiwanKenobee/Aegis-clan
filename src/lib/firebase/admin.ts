/**
 * @fileOverview Firebase Admin SDK Initialization
 *
 * This file initializes the Firebase Admin SDK, allowing for backend operations
 * such as token verification, custom claim management, and direct Firestore access.
 * It expects Google Application Default Credentials to be set up in the environment
 * (e.g., via GOOGLE_APPLICATION_CREDENTIALS or by running in a GCP environment).
 */
import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  try {
    admin.initializeApp({
      // If you have a specific service account JSON, you can pass it here:
      // credential: admin.credential.cert(require('/path/to/your/serviceAccountKey.json')),
      // Otherwise, it will use Google Application Default Credentials.
    });
    console.log('Firebase Admin SDK initialized successfully.');
  } catch (error) {
    console.error('Firebase Admin SDK initialization error:', error);
    // Optionally, throw the error or handle it as per your application's needs
    // For example, if Firebase Admin is critical, you might want to prevent app startup.
  }
}

export const firebaseAdmin = admin;
export const authAdmin = admin.auth();
export const firestoreAdmin = admin.firestore();
