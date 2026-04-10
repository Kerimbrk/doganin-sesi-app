import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { auth, db } from '../config/firebase';

export const ROLES = {
  ADMIN:     'admin',
  TRAINER:   'trainer',
  GUIDE:     'guide',
  VOLUNTEER: 'volunteer',
  STUDENT:   'student',
  PARENT:    'parent',
};

// Ad Soyad → dahili e-posta formatına çevirir
// "Kerim Burak Beyge" → "kerimburakbeyge@doganin-sesi.app"
export function nameToEmail(fullName) {
  return fullName
    .toLowerCase()
    .replace(/ç/g, 'c').replace(/ş/g, 's').replace(/ğ/g, 'g')
    .replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/ı/g, 'i')
    .replace(/â/g, 'a').replace(/î/g, 'i').replace(/û/g, 'u')
    .replace(/\s+/g, '')
    + '@doganin-sesi.app';
}

// Expo push token al ve Firestore'a kaydet
async function savePushToken(uid) {
  try {
    if (!Device.isDevice) return;
    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;
    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return;
    const token = (await Notifications.getExpoPushTokenAsync()).data;
    await updateDoc(doc(db, 'users', uid), { expoPushToken: token });
  } catch { /* bildirim izni yoksa sessizce geç */ }
}

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const profileDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        setProfile(profileDoc.exists() ? profileDoc.data() : null);
        setUser(firebaseUser);
        // Push token'ı arka planda kaydet
        savePushToken(firebaseUser.uid);
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const login = (fullName, phone) =>
    signInWithEmailAndPassword(auth, nameToEmail(fullName.trim()), phone.trim());

  const logout = () => signOut(auth);

  const isAdmin       = () => profile?.role === ROLES.ADMIN;
  const canPost       = () => profile?.role !== ROLES.PARENT;
  const canUploadLive = () => [ROLES.VOLUNTEER, ROLES.GUIDE].includes(profile?.role);

  return (
    <AuthContext.Provider
      value={{ user, profile, loading, login, logout, isAdmin, canPost, canUploadLive }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
