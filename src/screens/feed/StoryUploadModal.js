/**
 * StoryUploadModal
 *
 * Tek Modal içinde iki aşama:
 *   1. "picker"  — Fotoğraf / Video seç
 *   2. "editor"  — StoryEditorModal bileşeni (overlay ekle, paylaş)
 *
 * İki ayrı Modal kullanmak iOS'ta "animasyon çakışması" hatasına yol açıyordu;
 * tek Modal içinde aşama geçişi yaparak çözüldü.
 */
import { useState } from 'react';
import {
  View, Text, Modal, TouchableOpacity, StyleSheet, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useUpload } from '../../hooks/useUpload';
import { pickMedia } from '../../utils/mediaPicker';
import { COLORS, RADIUS } from '../../config/theme';
import StoryEditorModal from './StoryEditorModal';

export default function StoryUploadModal({ visible, onClose }) {
  const insets   = useSafeAreaInsets();
  const { user, profile } = useAuth();
  const { upload } = useUpload();

  const [media,     setMedia]     = useState(null);   // { uri, type }
  const [uploading, setUploading] = useState(false);

  // Medya seç — editör aşamasına geç
  const handlePick = async (type) => {
    const asset = await pickMedia(type);
    if (asset) setMedia({ uri: asset.uri, type });
  };

  // Editörden "Paylaş" geldi → yükle + Firestore'a yaz
  const handleEditorDone = async (overlays) => {
    if (!media) return;
    setUploading(true);
    try {
      const mediaUrl  = await upload(media.uri, 'stories');
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await addDoc(collection(db, 'stories'), {
        authorId:   user.uid,
        authorName: profile?.displayName || user.displayName,
        authorRole: profile?.role,
        mediaUrl,
        mediaType:  media.type,
        overlays:   overlays ?? [],
        createdAt:  serverTimestamp(),
        expiresAt:  Timestamp.fromDate(expiresAt),
      });
      handleClose();
    } catch (e) {
      Alert.alert('Hata', 'Story paylaşılamadı: ' + e.message);
    } finally {
      setUploading(false);
    }
  };

  // Tamamen kapat — state temizle
  const handleClose = () => {
    setMedia(null);
    onClose();
  };

  // Editörden "geri" geldi — picker aşamasına dön
  const handleEditorBack = () => setMedia(null);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={media ? handleEditorBack : handleClose}
    >
      {/* ── Aşama 1: Picker ── */}
      {!media && (
        <View style={[su.container, { paddingBottom: insets.bottom + 16 }]}>
          <View style={su.handle} />

          <View style={su.headerRow}>
            <Text style={su.title}>Story Paylaş</Text>
            <TouchableOpacity onPress={handleClose} style={su.closeBtn}>
              <Ionicons name="close" size={22} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>
          <Text style={su.sub}>24 saat boyunca görünür kalır</Text>

          <View style={su.pickRow}>
            <TouchableOpacity style={su.pickBtn} onPress={() => handlePick('image')}>
              <Ionicons name="image-outline" size={40} color={COLORS.primaryMid} />
              <Text style={su.pickLabel}>Fotoğraf</Text>
            </TouchableOpacity>
            <TouchableOpacity style={su.pickBtn} onPress={() => handlePick('video')}>
              <Ionicons name="videocam-outline" size={40} color={COLORS.primaryMid} />
              <Text style={su.pickLabel}>Video</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={su.cancelBtn} onPress={handleClose}>
            <Text style={su.cancelText}>İptal</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Aşama 2: Editör (aynı Modal içinde, ayrı modal açılmıyor) ── */}
      {!!media && (
        <StoryEditorModal
          inline          // Modal değil, View olarak render edilsin
          media={media}
          uploading={uploading}
          onClose={handleEditorBack}
          onDone={handleEditorDone}
        />
      )}
    </Modal>
  );
}

const su = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: COLORS.background,
    paddingHorizontal: 20, paddingTop: 12,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: COLORS.border,
    alignSelf: 'center', marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 4,
  },
  title:    { fontSize: 20, fontWeight: '800', color: COLORS.primary },
  closeBtn: { padding: 4 },
  sub:      { fontSize: 13, color: COLORS.textMuted, marginBottom: 32 },

  pickRow: { flexDirection: 'row', gap: 14, marginBottom: 24 },
  pickBtn: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingVertical: 44, borderRadius: 16,
    backgroundColor: COLORS.primaryPale, gap: 12,
  },
  pickLabel: { fontSize: 15, fontWeight: '600', color: COLORS.primaryMid },

  cancelBtn: {
    paddingVertical: 14, borderRadius: RADIUS.full,
    borderWidth: 1.5, borderColor: COLORS.border, alignItems: 'center',
    marginTop: 'auto',
  },
  cancelText: { fontSize: 15, fontWeight: '600', color: COLORS.textSecondary },
});
