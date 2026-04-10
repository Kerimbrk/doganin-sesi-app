import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence, getAuth, initializeAuth as initAuth2 } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: 'AIzaSyAk3cECG_iQzGIjoeuzyVaCEt6qDVtSpTQ',
  authDomain: 'doganin-sesi-app.firebaseapp.com',
  projectId: 'doganin-sesi-app',
  storageBucket: 'doganin-sesi-app.firebasestorage.app',
  messagingSenderId: '998345448874',
  appId: '1:998345448874:web:4a6ea9be86eaa93047dfd3',
  measurementId: 'G-53FRN8KR2L',
};

// Ana uygulama — mevcut oturumu yönetir
const app = initializeApp(firebaseConfig);

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

export const db        = getFirestore(app);
export const functions = getFunctions(app, 'europe-west1');

// İkincil uygulama — admin kullanıcı oluştururken mevcut oturumu bozmaz
const secondaryApp  = initializeApp(firebaseConfig, 'secondary');
export const auth2  = initAuth2(secondaryApp);   // bellek içi, kalıcı değil

export default app;
