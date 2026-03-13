import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'

const t = (v) => (v || '').trim()

const firebaseConfig = {
  apiKey: t(import.meta.env.VITE_FIREBASE_API_KEY),
  authDomain: t(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN),
  projectId: t(import.meta.env.VITE_FIREBASE_PROJECT_ID),
  storageBucket: t(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET),
  messagingSenderId: t(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID),
  appId: t(import.meta.env.VITE_FIREBASE_APP_ID),
}

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)
export const auth = getAuth(app)
export const googleProvider = new GoogleAuthProvider()
