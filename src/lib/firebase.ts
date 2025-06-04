import { initializeApp, getApps, deleteApp, type FirebaseApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getVertexAI, getGenerativeModel } from 'firebase/vertexai-preview';
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
       if (!getApps().length) {
               app = initializeApp(firebaseConfig);
       } else {
               app = getApps()[0];
               deleteApp(app);
               app = initializeApp(firebaseConfig);
       }
}

const vertexAI = app ? getVertexAI(app) : undefined;

export const db = app ? getFirestore(app, 'policycraft') : undefined as any;
export const auth = app ? getAuth(app) : undefined as any;
export const model = app ? getGenerativeModel(vertexAI!, { model: 'gemini-1.5-pro' }) : undefined as any;
export const googleProvider = new GoogleAuthProvider();
