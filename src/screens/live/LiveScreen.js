import { useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator, Image, Alert
} from 'react-native';
import { Video } from 'expo-av';
import { collection, addDoc, onSnapshot, orderBy, query, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { db } from '../../config/firebase';
import { useAuth, ROLES } from '../../contexts/AuthContext';
import { useUpload } from '../../hooks/useUpload';
import { useBadgeEngine } from '../../hooks/useBadgeEngine';
import { pickMedia } from '../../utils/mediaPicker';

export default function LiveScreen() {
  const insets = useSafeAreaInsets();
  const { user, profile, canUploadLive } = useAuth();
  const { upload } = useUpload();
  const { checkFieldExpert } = useBadgeEngine();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'liveVideos'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => {
      setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, []);

  const uploadItem = async (type) => {
    const asset = await pickMedia(type);
    if (!asset) return;
    setLoading(true);
    try {
      const mediaUrl = await upload(asset.uri, 'live');
      await addDoc(collection(db, 'liveVideos'), {
        mediaUrl,
        mediaType: type,
        authorId: user.uid,
        authorName: profile?.displayName || user.displayName,
        authorRole: profile?.role,
        createdAt: serverTimestamp(),
      });
      await checkFieldExpert();
    } catch (e) {
      Alert.alert('Hata', 'Yüklenemedi: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteItem = (itemId, authorId) => {
    if (authorId !== user.uid && profile?.role !== ROLES.ADMIN) return;
    Alert.alert('İçeriği Sil', 'Emin misiniz?', [
      { text: 'İptal' },
      { text: 'Sil', style: 'destructive', onPress: () => deleteDoc(doc(db, 'liveVideos', itemId)) },
    ]);
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.header, { paddingTop: insets.top + 12 }]}>🎤 Sahadan Canlı</Text>

      {canUploadLive() && (
        <View style={styles.uploadBar}>
          <TouchableOpacity style={styles.uploadBtn} onPress={() => uploadItem('image')} disabled={loading}>
            <Text style={styles.uploadBtnText}>📷 Fotoğraf</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.uploadBtn} onPress={() => uploadItem('video')} disabled={loading}>
            <Text style={styles.uploadBtnText}>🎬 Video</Text>
          </TouchableOpacity>
          {loading && <ActivityIndicator color="#283593" />}
        </View>
      )}

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onLongPress={() => deleteItem(item.id, item.authorId)}
          >
            {item.mediaType === 'image'
              ? <Image source={{ uri: item.mediaUrl }} style={styles.media} />
              : <Video source={{ uri: item.mediaUrl }} style={styles.media} useNativeControls resizeMode="cover" />
            }
            <Text style={styles.cardAuthor}>
              {item.authorName} · {item.authorRole}
            </Text>
          </TouchableOpacity>
        )}
        contentContainerStyle={{ paddingBottom: 20 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#e8eaf6' },
  header: { fontSize: 22, fontWeight: 'bold', paddingHorizontal: 16, paddingBottom: 12, color: '#283593' },
  uploadBar: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 12, marginBottom: 10 },
  uploadBtn: { backgroundColor: '#283593', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  uploadBtnText: { color: '#fff', fontWeight: 'bold' },
  card: { margin: 12, backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden', elevation: 2 },
  media: { width: '100%', height: 220 },
  cardAuthor: { padding: 10, color: '#555', fontSize: 12 },
});
