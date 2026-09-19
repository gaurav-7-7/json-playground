import { initializeApp, getApps, getApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
    apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
    authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
    databaseURL: process.env.REACT_APP_FIREBASE_DATABASE_URL,
    projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
    storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.REACT_APP_FIREBASE_APP_ID
};

export const isFirebaseConfigured = Boolean(
    firebaseConfig.apiKey &&
    firebaseConfig.databaseURL &&
    firebaseConfig.projectId &&
    !firebaseConfig.apiKey.includes('your-api-key')
);

let db = null;
let app = null;

if (isFirebaseConfigured) {
    try {
        app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
        db = getDatabase(app);
    } catch (error) {
        console.error('Firebase initialization error:', error);
    }
} else {
    console.warn(
        'Firebase is not fully configured. Please set your REACT_APP_FIREBASE_* environment variables in .env or your deployment dashboard.'
    );
}

export { db, app };
