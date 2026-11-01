import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider, type Auth } from 'firebase/auth';
import { building } from '$app/environment';
const {
	VITE_API_KEY,
	VITE_AUTH_DOMAIN,
	VITE_PROJECT_ID,
	VITE_STORAGE_BUCKET,
	VITE_MESSAGING_SENDER_ID,
	VITE_APP_ID
} = import.meta.env;

const firebaseConfig = {
	apiKey: VITE_API_KEY,
	authDomain: VITE_AUTH_DOMAIN,
	projectId: VITE_PROJECT_ID,
	storageBucket: VITE_STORAGE_BUCKET,
	messagingSenderId: VITE_MESSAGING_SENDER_ID,
	appId: VITE_APP_ID
};

let app: FirebaseApp | undefined;

if (!building) {
	app = getApps()[0] ?? initializeApp(firebaseConfig);
}

// Build-time route discovery does not execute database or authentication calls.
export const db = (app ? getFirestore(app) : undefined) as Firestore;
export const auth = (app ? getAuth(app) : undefined) as Auth;
export const googleProvider = new GoogleAuthProvider();
