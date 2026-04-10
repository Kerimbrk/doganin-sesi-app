import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  TextInput, Image, ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import {
  collection, addDoc, onSnapshot, orderBy, query,
  serverTimestamp, doc, updateDoc, arrayUnion, arrayRemove, deleteDoc,
} from 'firebase/firestore';
import * as Location from 'expo-location';
import { Video } from 'expo-av';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { db } from '../../config/firebase';
import { useAuth, ROLES } from '../../contexts/AuthContext';
import { useUpload } from '../../hooks/useUpload';
import { useBadgeEngine } from '../../hooks/useBadgeEngine';
import CommentSection from '../../components/CommentSection';
import { pickMedia } from '../../utils/mediaPicker';
import { COLORS, ROLE_LABELS, SHADOWS, RADIUS } from '../../config/theme';
import StoryViewerModal from './StoryViewerModal';
import StoryUploadModal from './StoryUploadModal';

// ─── Yardımcılar ─────────────────────────────────────────────────────────────

function timeAgo(ts) {
  if (!ts?.toDate) return '';
  const diff = Date.now() - ts.toDate().getTime();
  if (diff < 60000)    return 'az önce';
  if (diff < 3600000)  return `${Math.floor(diff / 60000)}dk`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}sa`;
  return `${Math.floor(diff / 86400000)}g`;
}

function Avatar({ name, size = 42, style }) {
  const initials = (name || '?')
    .split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const palette = [
    COLORS.primaryMid, '#065F46', '#1D4ED8', '#4338CA',
    '#92400E', '#065F46', '#B45309',
  ];
  const bg = palette[(name?.charCodeAt(0) || 0) % palette.length];
  return (
    <View style={[{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: bg, justifyContent: 'center', alignItems: 'center',
    }, style]}>
      <Text style={{ color: '#fff', fontWeight: '700', fontSize: size * 0.38 }}>
        {initials}
      </Text>
    </View>
  );
}

function RoleBadge({ role }) {
  if (!role) return null;
  const color = COLORS.roles[role] || COLORS.textMuted;
  return (
    <View style={[badgeStyle.wrap, { borderColor: color }]}>
      <Text style={[badgeStyle.text, { color }]}>{ROLE_LABELS[role] || role}</Text>
    </View>
  );
}
const badgeStyle = StyleSheet.create({
  wrap: { borderWidth: 1, borderRadius: RADIUS.full, paddingHorizontal: 6, paddingVertical: 1, alignSelf: 'flex-start' },
  text: { fontSize: 10, fontWeight: '600' },
});

// ─── PostComposer — kendi text/media state'ini yönetir ───────────────────────
// FeedScreen'den BAĞIMSIZ bileşen: harf yazıldığında sadece bu bileşen render
// olur, FeedScreen ve FlatList etkilenmez → klavye düşmez.

function PostComposer({ isOpen, onOpen, onClose, profile }) {
  const { user } = useAuth();
  const { upload } = useUpload();
  const { checkFirstPost } = useBadgeEngine();

  const [text, setText] = useState('');
  const [media, setMedia] = useState(null);
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');

  const handlePickImage = async () => {
    const asset = await pickMedia('image');
    if (asset) setMedia({ uri: asset.uri, type: 'image' });
  };

  const handlePickVideo = async () => {
    const asset = await pickMedia('video');
    if (asset) setMedia({ uri: asset.uri, type: 'video' });
  };

  const handleLocation = async () => {
    if (location) { setLocation(null); return; }
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('İzin Gerekli', 'Konum için izin verilmedi.');
      return;
    }
    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    const [place] = await Location.reverseGeocodeAsync(loc.coords);
    setLocation({
      latitude:  loc.coords.latitude,
      longitude: loc.coords.longitude,
      name: place
        ? `${place.district || place.city || ''}, ${place.region || ''}`.trim().replace(/^,\s*/, '')
        : '',
    });
  };

  const handlePost = async () => {
    if (!text.trim() && !media) return;
    setLoading(true);
    try {
      let mediaUrl = null;
      if (media) {
        setUploadProgress('Yükleniyor...');
        mediaUrl = await upload(media.uri, 'posts');
        setUploadProgress('');
      }
      await addDoc(collection(db, 'posts'), {
        text:       text.trim(),
        authorId:   user.uid,
        authorName: profile?.displayName || user.displayName,
        authorRole: profile?.role,
        mediaUrl,
        mediaType:  media?.type || null,
        location:   location || null,
        likes:      [],
        createdAt:  serverTimestamp(),
      });
      setText('');
      setMedia(null);
      setLocation(null);
      onClose();
      await checkFirstPost();
    } catch (e) {
      Alert.alert('Hata', 'Paylaşım gönderilemedi: ' + e.message);
    } finally {
      setLoading(false);
      setUploadProgress('');
    }
  };

  if (!isOpen) {
    return (
      <TouchableOpacity
        style={[s.composerTrigger, SHADOWS.card]}
        onPress={onOpen}
        activeOpacity={0.85}
      >
        <Avatar name={profile?.displayName} size={36} />
        <Text style={s.composerPlaceholder}>Gözlemini paylaş...</Text>
        <Ionicons name="camera-outline" size={22} color={COLORS.primaryLight} />
      </TouchableOpacity>
    );
  }

  return (
    <View style={[s.composerCard, SHADOWS.card]}>
      <View style={s.composerTop}>
        <Avatar name={profile?.displayName} size={36} />
        <TextInput
          style={s.composerInput}
          placeholder="Gözlemini paylaş..."
          placeholderTextColor={COLORS.textMuted}
          value={text}
          onChangeText={setText}
          multiline
          autoFocus
        />
      </View>

      {media?.type === 'image' && (
        <Image source={{ uri: media.uri }} style={s.preview} />
      )}
      {media?.type === 'video' && (
        <Video source={{ uri: media.uri }} style={s.preview} useNativeControls resizeMode="cover" />
      )}

      {location && (
        <View style={s.locationChip}>
          <Ionicons name="location" size={12} color={COLORS.primaryMid} />
          <Text style={s.locationChipText}>{location.name || 'Konum eklendi'}</Text>
          <TouchableOpacity onPress={() => setLocation(null)}>
            <Ionicons name="close" size={13} color={COLORS.textMuted} />
          </TouchableOpacity>
        </View>
      )}

      <View style={s.composerFooter}>
        <View style={s.composerIcons}>
          <TouchableOpacity onPress={handlePickImage} style={s.iconBtn}>
            <Ionicons name="image-outline" size={22} color={COLORS.primaryMid} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handlePickVideo} style={s.iconBtn}>
            <Ionicons name="videocam-outline" size={22} color={COLORS.primaryMid} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleLocation}
            style={[s.iconBtn, location && s.iconBtnActive]}
          >
            <Ionicons
              name="location-outline"
              size={22}
              color={location ? COLORS.primaryLight : COLORS.primaryMid}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => { onClose(); setMedia(null); setLocation(null); }}
            style={s.iconBtn}
          >
            <Ionicons name="close-outline" size={22} color={COLORS.textMuted} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={handlePost}
          style={[s.postBtn, (!text.trim() && !media) && s.postBtnDisabled]}
          disabled={loading || (!text.trim() && !media)}
        >
          {loading ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <ActivityIndicator color="#fff" size="small" />
              {uploadProgress ? <Text style={s.postBtnText}>{uploadProgress}</Text> : null}
            </View>
          ) : (
            <Text style={s.postBtnText}>Paylaş</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Ana bileşen ─────────────────────────────────────────────────────────────

export default function FeedScreen() {
  const insets = useSafeAreaInsets();
  const { user, profile, canPost } = useAuth();

  const [posts,  setPosts]  = useState([]);
  const [stories, setStories] = useState([]);
  const [seenIds, setSeenIds] = useState(new Set());
  const [expandedComments, setExpandedComments] = useState({});
  const [composerOpen,     setComposerOpen]     = useState(false);
  const [storyUploadOpen,  setStoryUploadOpen]  = useState(false);
  const [viewerVisible,    setViewerVisible]    = useState(false);
  const [viewerStories,    setViewerStories]    = useState([]);

  // Gönderiler
  useEffect(() => {
    const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, snap =>
      setPosts(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
  }, []);

  // Story'ler — 24 saat içindekiler
  useEffect(() => {
    const q = query(collection(db, 'stories'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, snap => {
      const now = Date.now();
      const active = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(s => {
          const exp = s.expiresAt?.toDate?.();
          if (exp) return exp.getTime() > now;
          // expiresAt yoksa createdAt'e göre 24 saat kontrol
          const created = s.createdAt?.toDate?.();
          return created ? now - created.getTime() < 86400000 : false;
        });
      setStories(active);
    });
  }, []);

  // Authorlara göre grupla
  const storyGroups = useMemo(() => {
    const map = {};
    stories.forEach(st => {
      if (!map[st.authorId]) {
        map[st.authorId] = { authorId: st.authorId, authorName: st.authorName, stories: [] };
      }
      map[st.authorId].stories.push(st);
    });
    return Object.values(map);
  }, [stories]);

  // ── Eylemler ──────────────────────────────────────────────────────────────

  const toggleLike = async (postId, likes) => {
    if (!user) return;
    const liked = likes?.includes(user.uid);
    await updateDoc(doc(db, 'posts', postId), {
      likes: liked ? arrayRemove(user.uid) : arrayUnion(user.uid),
    });
  };

  const deletePost = async (postId, authorId) => {
    if (!user) return;
    if (authorId !== user.uid && profile?.role !== ROLES.ADMIN) return;
    Alert.alert('Paylaşımı Sil', 'Emin misiniz?', [
      { text: 'İptal' },
      { text: 'Sil', style: 'destructive', onPress: () => deleteDoc(doc(db, 'posts', postId)) },
    ]);
  };

  const toggleComments = id =>
    setExpandedComments(prev => ({ ...prev, [id]: !prev[id] }));

  const handleStorySeen = useCallback((storyId) => {
    setSeenIds(prev => new Set([...prev, storyId]));
  }, []);

  const openViewer = useCallback((groupStories) => {
    setViewerStories(groupStories);
    setViewerVisible(true);
  }, []);

  // ── Post kartı ────────────────────────────────────────────────────────────

  const renderPost = useCallback(({ item }) => {
    const liked     = user ? item.likes?.includes(user.uid) : false;
    const canDelete = user && (item.authorId === user.uid || profile?.role === ROLES.ADMIN);

    return (
      <View style={[s.card, SHADOWS.card]}>
        <View style={s.cardHeader}>
          <Avatar name={item.authorName} size={40} />
          <View style={s.cardHeaderText}>
            <Text style={s.authorName}>{item.authorName}</Text>
            <View style={s.metaRow}>
              <RoleBadge role={item.authorRole} />
              <Text style={s.timeText}>{timeAgo(item.createdAt)}</Text>
            </View>
          </View>
          {canDelete && (
            <TouchableOpacity onPress={() => deletePost(item.id, item.authorId)} style={s.moreBtn}>
              <Ionicons name="ellipsis-horizontal" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {item.mediaType === 'image' && item.mediaUrl && (
          <Image source={{ uri: item.mediaUrl }} style={s.postMedia} />
        )}
        {item.mediaType === 'video' && item.mediaUrl && (
          <Video source={{ uri: item.mediaUrl }} style={s.postMedia} useNativeControls resizeMode="cover" />
        )}

        <View style={s.actions}>
          <TouchableOpacity onPress={() => toggleLike(item.id, item.likes)} style={s.actionBtn}>
            <Ionicons
              name={liked ? 'heart' : 'heart-outline'}
              size={22}
              color={liked ? COLORS.like : COLORS.likeInactive}
            />
            <Text style={[s.actionCount, liked && { color: COLORS.like }]}>
              {item.likes?.length || 0}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => toggleComments(item.id)} style={s.actionBtn}>
            <Ionicons
              name={expandedComments[item.id] ? 'chatbubble' : 'chatbubble-outline'}
              size={20}
              color={expandedComments[item.id] ? COLORS.primaryMid : COLORS.likeInactive}
            />
            <Text style={s.actionCount}>Yorum</Text>
          </TouchableOpacity>

          {item.location?.name && (
            <View style={s.locationTag}>
              <Ionicons name="location-outline" size={13} color={COLORS.primaryLight} />
              <Text style={s.locationText}>{item.location.name}</Text>
            </View>
          )}
        </View>

        {item.text ? (
          <Text style={s.caption}>
            <Text style={s.captionAuthor}>{item.authorName}  </Text>
            {item.text}
          </Text>
        ) : null}

        {expandedComments[item.id] && (
          <View style={s.commentsWrap}>
            <CommentSection postId={item.id} />
          </View>
        )}
      </View>
    );
  }, [user?.uid, profile?.role, expandedComments]);

  // ── Ana render ────────────────────────────────────────────────────────────
  // Story bar ve composer FlatList DIŞINDA → text yazarken FeedScreen'i
  // hiç re-render etmez → klavye asla düşmez.

  return (
    <View style={s.screen}>

      {/* Başlık */}
      <View style={[s.header, { paddingTop: insets.top + 10 }]}>
        <View>
          <Text style={s.headerTitle}>Doğanın Sesi</Text>
          <Text style={s.headerSub}>4004 Kamp Akışı</Text>
        </View>
        <TouchableOpacity style={s.notifBtn}>
          <Ionicons name="notifications-outline" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Story bar */}
      {(storyGroups.length > 0 || canPost()) && (
        <View style={s.storySection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.storyList}
          >
            {/* + Ekle butonu */}
            {canPost() && (
              <TouchableOpacity
                style={s.storyItem}
                onPress={() => setStoryUploadOpen(true)}
              >
                <View style={[s.storyRing, s.addStoryRing]}>
                  <View style={s.addStoryCircle}>
                    <Ionicons name="add" size={28} color={COLORS.white} />
                  </View>
                </View>
                <Text style={s.storyName}>Paylaş</Text>
              </TouchableOpacity>
            )}

            {/* Story halkaları */}
            {storyGroups.map(group => {
              const hasUnseen = group.stories.some(st => !seenIds.has(st.id));
              return (
                <TouchableOpacity
                  key={group.authorId}
                  style={s.storyItem}
                  onPress={() => openViewer(group.stories)}
                >
                  <View style={[s.storyRing, !hasUnseen && s.storyRingSeen]}>
                    <Avatar name={group.authorName} size={52} />
                  </View>
                  <Text style={s.storyName} numberOfLines={1}>
                    {(group.authorName || '').split(' ')[0]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Composer */}
      {canPost() && (
        <View style={s.composerWrap}>
          <PostComposer
            isOpen={composerOpen}
            onOpen={() => setComposerOpen(true)}
            onClose={() => setComposerOpen(false)}
            profile={profile}
          />
        </View>
      )}

      {/* Feed listesi */}
      <FlatList
        data={posts}
        keyExtractor={item => item.id}
        renderItem={renderPost}
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      />

      {/* Story görüntüleyici */}
      <StoryViewerModal
        visible={viewerVisible}
        stories={viewerStories}
        onClose={() => setViewerVisible(false)}
        onSeen={handleStorySeen}
      />

      {/* Story yükleme */}
      <StoryUploadModal
        visible={storyUploadOpen}
        onClose={() => setStoryUploadOpen(false)}
      />
    </View>
  );
}

// ─── Stiller ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },

  // Başlık
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
    paddingHorizontal: 18, paddingBottom: 12,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1, borderBottomColor: COLORS.borderLight,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: COLORS.primary, letterSpacing: -0.5 },
  headerSub:   { fontSize: 12, color: COLORS.textMuted, marginTop: 1 },
  notifBtn:    { padding: 4 },

  // Story bar
  storySection: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  storyList:    { paddingHorizontal: 16, gap: 14 },
  storyItem:    { alignItems: 'center', width: 66 },
  storyRing: {
    width: 60, height: 60, borderRadius: 30,
    borderWidth: 2.5, borderColor: COLORS.primaryLight,
    padding: 2, justifyContent: 'center', alignItems: 'center',
    marginBottom: 5,
  },
  storyRingSeen: { borderColor: COLORS.border },
  addStoryRing:  { borderColor: COLORS.primaryMid, borderStyle: 'dashed' },
  addStoryCircle: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: COLORS.primaryMid,
    justifyContent: 'center', alignItems: 'center',
  },
  storyName: { fontSize: 11, color: COLORS.textSecondary, textAlign: 'center', fontWeight: '500' },

  // Composer
  composerWrap: { marginHorizontal: 14, marginVertical: 8 },
  composerTrigger: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: COLORS.card, borderRadius: RADIUS.lg,
    padding: 12,
  },
  composerPlaceholder: { flex: 1, color: COLORS.textMuted, fontSize: 14 },
  composerCard: {
    backgroundColor: COLORS.card, borderRadius: RADIUS.lg,
    padding: 14,
  },
  composerTop:   { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  composerInput: {
    flex: 1, fontSize: 15, color: COLORS.textPrimary,
    minHeight: 56, lineHeight: 22,
    textAlignVertical: 'top',
  },
  preview: { width: '100%', height: 160, borderRadius: RADIUS.md, marginBottom: 10 },
  locationChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: COLORS.primaryPale, borderRadius: RADIUS.full,
    paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start', marginBottom: 10,
  },
  locationChipText: { fontSize: 12, color: COLORS.primaryMid, fontWeight: '500', flex: 1 },
  composerFooter:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  composerIcons:    { flexDirection: 'row', gap: 4 },
  iconBtn:          { padding: 7, borderRadius: RADIUS.sm },
  iconBtnActive:    { backgroundColor: COLORS.primaryPale },
  postBtn: {
    backgroundColor: COLORS.primaryMid,
    paddingHorizontal: 20, paddingVertical: 9,
    borderRadius: RADIUS.full,
  },
  postBtnDisabled: { backgroundColor: COLORS.textMuted },
  postBtnText:     { color: '#fff', fontWeight: '700', fontSize: 14 },

  // Post kartı
  listContent: { paddingHorizontal: 14, paddingBottom: 24, paddingTop: 8 },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    marginBottom: 14,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 12,
  },
  cardHeaderText: { flex: 1 },
  authorName:     { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  metaRow:        { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
  timeText:       { fontSize: 11, color: COLORS.textMuted },
  moreBtn:        { padding: 4 },

  postMedia: { width: '100%', height: 220 },

  actions: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingTop: 10, paddingBottom: 6,
    gap: 16,
  },
  actionBtn:    { flexDirection: 'row', alignItems: 'center', gap: 5 },
  actionCount:  { fontSize: 13, color: COLORS.textSecondary, fontWeight: '500' },
  locationTag:  { flexDirection: 'row', alignItems: 'center', gap: 3, marginLeft: 'auto' },
  locationText: { fontSize: 11, color: COLORS.primaryLight, fontWeight: '500' },

  caption: {
    paddingHorizontal: 14, paddingBottom: 12,
    fontSize: 13, color: COLORS.textSecondary, lineHeight: 19,
  },
  captionAuthor: { fontWeight: '700', color: COLORS.textPrimary },

  commentsWrap: {
    borderTopWidth: 1, borderTopColor: COLORS.borderLight,
    paddingTop: 8,
  },
});
