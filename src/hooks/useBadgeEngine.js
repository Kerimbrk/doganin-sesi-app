import { doc, updateDoc, arrayUnion, increment, getDoc } from 'firebase/firestore';
import * as Notifications from 'expo-notifications';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';

const BADGE_DEFS = {
  explorer:    { label: 'Doğa Kaşifi 🥉',       points: 10 },
  interaction: { label: 'Etkileşim Ustası 🥈',   points: 25 },
  field_expert:{ label: 'Saha Uzmanı 🥇',         points: 50 },
  art_soul:    { label: 'Sanat Ruhu 💎',           points: 40 },
  project_star:{ label: 'Proje Yıldızı ⭐',        points: 100 },
};

async function awardBadge(uid, badgeKey) {
  const def = BADGE_DEFS[badgeKey];
  await updateDoc(doc(db, 'users', uid), {
    badges: arrayUnion(badgeKey),
    points: increment(def.points),
  });
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '🏅 Yeni Rozet Kazandın!',
      body: `Tebrikler! "${def.label}" rozetini kazandın.`,
    },
    trigger: null,
  });
}

export function useBadgeEngine() {
  const { user, profile } = useAuth();

  const hasBadge = (key) => (profile?.badges || []).includes(key);

  const checkFirstPost = async () => {
    if (!user) return;
    if (hasBadge('explorer')) return;
    await awardBadge(user.uid, 'explorer');
  };

  const checkInteraction = async () => {
    if (!user) return;
    if (hasBadge('interaction')) return;
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    const pts = userDoc.data()?.interactionCount || 0;
    if (pts >= 9) await awardBadge(user.uid, 'interaction');
    else await updateDoc(doc(db, 'users', user.uid), { interactionCount: increment(1) });
  };

  const checkArtSoul = async () => {
    if (!user) return;
    if (hasBadge('art_soul')) return;
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    const count = userDoc.data()?.galleryCount || 0;
    if (count >= 2) await awardBadge(user.uid, 'art_soul');
    else await updateDoc(doc(db, 'users', user.uid), { galleryCount: increment(1) });
  };

  const checkFieldExpert = async () => {
    if (!user) return;
    if (hasBadge('field_expert')) return;
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    const count = userDoc.data()?.liveCount || 0;
    if (count >= 4) await awardBadge(user.uid, 'field_expert');
    else await updateDoc(doc(db, 'users', user.uid), { liveCount: increment(1) });
  };

  return { checkFirstPost, checkInteraction, checkArtSoul, checkFieldExpert };
}
