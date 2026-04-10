import { useEffect, useState } from 'react';
import {
  View, Text, FlatList, Image, StyleSheet,
  TouchableOpacity, ActivityIndicator, Alert
} from 'react-native';
import { collection, addDoc, onSnapshot, orderBy, query, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { pickMedia } from '../../utils/mediaPicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { db } from '../../config/firebase';
import { useAuth, ROLES } from '../../contexts/AuthContext';
import { useUpload } from '../../hooks/useUpload';
import { useBadgeEngine } from '../../hooks/useBadgeEngine';

export default function GalleryScreen() {
  const insets = useSafeAreaInsets();
  const { user, profile, canPost } = useAuth();
  const { upload } = useUpload();
  const { checkArtSoul } = useBadgeEngine();
  const [artworks, setArtworks] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'gallery'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => {
      setArtworks(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, []);

  const uploadArtwork = async () => {
    const asset = await pickMedia('image');
    if (!asset) return;
    setLoading(true);
    try {
      const imageUrl = await upload(asset.uri, 'gallery');
      await addDoc(collection(db, 'gallery'), {
        imageUrl,
        authorId: user.uid,
        authorName: profile?.displayName || user.displayName,
        createdAt: serverTimestamp(),
      });
      await checkArtSoul();
    } catch (e) {
      Alert.alert('Hata', 'Yüklenemedi: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteArtwork = (itemId, authorId) => {
    if (authorId !== user.uid && profile?.role !== ROLES.ADMIN) return;
    Alert.alert('Eseri Sil', 'Emin misiniz?', [
      { text: 'İptal' },
      { text: 'Sil', style: 'destructive', onPress: () => deleteDoc(doc(db, 'gallery', itemId)) },
    ]);
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.header, { paddingTop: insets.top + 12 }]}>🎨 Sanat & Felsefe Galerisi</Text>

      {canPost() && (
        <TouchableOpacity style={styles.uploadBtn} onPress={uploadArtwork} disabled={loading}>
          {loading
            ? <><ActivityIndicator color="#fff" size="small" /><Text style={styles.uploadBtnText}> Yükleniyor...</Text></>
            : <Text style={styles.uploadBtnText}>🎨 Eser Yükle</Text>
          }
        </TouchableOpacity>
      )}

      <FlatList
        data={artworks}
        numColumns={2}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.artCard}
            onLongPress={() => deleteArtwork(item.id, item.authorId)}
          >
            <Image source={{ uri: item.imageUrl }} style={styles.artImage} />
            <Text style={styles.artAuthor}>{item.authorName}</Text>
          </TouchableOpacity>
        )}
        contentContainerStyle={{ padding: 8 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fce4ec' },
  header: { fontSize: 22, fontWeight: 'bold', paddingHorizontal: 16, paddingBottom: 12, color: '#ad1457' },
  uploadBtn: { flexDirection: 'row', margin: 12, backgroundColor: '#ad1457', padding: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  uploadBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  artCard: { flex: 1, margin: 4, backgroundColor: '#fff', borderRadius: 10, overflow: 'hidden' },
  artImage: { width: '100%', height: 140 },
  artAuthor: { padding: 6, fontSize: 12, color: '#555', textAlign: 'center' },
});
