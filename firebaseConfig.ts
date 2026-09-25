import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
// @ts-ignore getReactNativePersistence está disponible en el entorno React Native
import { initializeAuth, getReactNativePersistence, getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export const firebaseConfig = {
  apiKey: "AIzaSyCN8LiyUQDgOnaPylCT4vCGCh0cvbDNfJ8",
  authDomain: "smash-match-ee78b.firebaseapp.com",
  projectId: "smash-match-ee78b",
  storageBucket: "smash-match-ee78b.firebasestorage.app",
  messagingSenderId: "734169789196",
  appId: "1:734169789196:web:31c260ef8bd3bf7918cf29"
};

// Evita re-inicializar en Fast Refresh de Expo
export const app: FirebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

let auth: Auth;
if (Platform.OS === 'web') {
  auth = getAuth(app);
} else {
  try {
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch (_e) {
    auth = getAuth(app);
  }
}

export { auth };
export const db: Firestore = getFirestore(app);
