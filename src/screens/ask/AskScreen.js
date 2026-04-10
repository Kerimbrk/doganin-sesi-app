import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TextInput,
  TouchableOpacity, ActivityIndicator, Alert, Image,
  Modal, ScrollView,
} from 'react-native';
import {
  collection, addDoc, onSnapshot, orderBy,
  query, serverTimestamp, doc, deleteDoc, getDocs, where,
} from 'firebase/firestore';
import { Video } from 'expo-av';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { db } from '../../config/firebase';
import { useAuth, ROLES } from '../../contexts/AuthContext';
import { useUpload } from '../../hooks/useUpload';
import { pickMedia } from '../../utils/mediaPicker';
import { COLORS, ROLE_LABELS, SHADOWS, RADIUS } from '../../config/theme';

const CAN_ANSWER = [ROLES.ADMIN, ROLES.TRAINER, ROLES.GUIDE];
// Etiketlenebilecek roller (uzmanlar)
const EXPERT_ROLES = [ROLES.TRAINER, ROLES.GUIDE, ROLES.ADMIN];

// Özel unvanlar — mention listesinde ve yanıt kartlarında görünür
const SPECIAL_TITLES = {
  'Kerim Burak Beyge': 'Proje Yürütücüsü',
  'Taner Özcan':       'Proje Uzmanı',
};

function expertTitle(expert) {
  return SPECIAL_TITLES[expert.displayName] || ROLE_LABELS[expert.role] || expert.role;
}

// ─── Expo Push Token ile bildirim gönder ──────────────────────────────────────
async function sendPushNotification(expoPushToken, title, body) {
  if (!expoPushToken) return;
  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: expoPushToken, title, body, sound: 'default' }),
    });
  } catch { /* sessizce geç */ }
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ name, size = 38 }) {
  const initials = (name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const palette = [COLORS.primaryMid, '#065F46', '#1D4ED8', '#4338CA', '#92400E', '#B45309'];
  const bg = palette[(name?.charCodeAt(0) || 0) % palette.length];
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ color: '#fff', fontWeight: '700', fontSize: size * 0.38 }}>{initials}</Text>
    </View>
  );
}

function RoleBadge({ role }) {
  if (!role) return null;
  const color = COLORS.roles[role] || COLORS.textMuted;
  return (
    <View style={{ borderWidth: 1, borderColor: color, borderRadius: 99, paddingHorizontal: 6, paddingVertical: 1 }}>
      <Text style={{ fontSize: 10, fontWeight: '600', color }}>{ROLE_LABELS[role] || role}</Text>
    </View>
  );
}

// ─── Soru metni — @mention'ları vurgular ─────────────────────────────────────
function QuestionText({ text }) {
  if (!text) return null;
  const parts = text.split(/(@\S+)/g);
  return (
    <Text style={s.questionText}>
      {parts.map((p, i) =>
        p.startsWith('@')
          ? <Text key={i} style={s.mentionText}>{p}</Text>
          : p
      )}
    </Text>
  );
}

// ─── Ana ekran ────────────────────────────────────────────────────────────────
export default function AskScreen() {
  const insets = useSafeAreaInsets();
  const { user, profile } = useAuth();
  const { upload } = useUpload();

  const [questions,    setQuestions]    = useState([]);
  const [experts,      setExperts]      = useState([]);   // etiketlenebilir uzmanlar
  const [questionText, setQuestionText] = useState('');
  const [media,        setMedia]        = useState(null);
  const [replyingTo,   setReplyingTo]   = useState(null);
  const [replyText,    setReplyText]    = useState('');
  const [loading,      setLoading]      = useState(false);
  const [uploading,    setUploading]    = useState(false);
  const [expandedId,   setExpandedId]   = useState(null);
  const [mentionModal, setMentionModal] = useState(false);

  const canAnswer = CAN_ANSWER.includes(profile?.role);

  // Sorular
  useEffect(() => {
    const q = query(collection(db, 'questions'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, snap =>
      setQuestions(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
  }, []);

  // Uzman listesi (trainer + guide + admin)
  useEffect(() => {
    const fetchExperts = async () => {
      const snaps = await Promise.all(
        EXPERT_ROLES.map(r => getDocs(query(collection(db, 'users'), where('role', '==', r))))
      );
      const all = snaps.flatMap(s => s.docs.map(d => ({ id: d.id, ...d.data() })));
      setExperts(all);
    };
    fetchExperts();
  }, []);

  // ── Mention ekle ──────────────────────────────────────────────────────────
  const addMention = (expert) => {
    const tag = `@${expert.displayName.replace(/\s+/g, '')} `;
    setQuestionText(prev => prev + tag);
    setMentionModal(false);
  };

  // ── Medya seç ─────────────────────────────────────────────────────────────
  const handlePickImage = async () => {
    const asset = await pickMedia('image');
    if (asset) setMedia({ uri: asset.uri, type: 'image' });
  };

  const handlePickVideo = async () => {
    const asset = await pickMedia('video');
    if (asset) setMedia({ uri: asset.uri, type: 'video' });
  };

  // ── Soru gönder ───────────────────────────────────────────────────────────
  const askQuestion = async () => {
    if (!questionText.trim() && !media) return;
    setLoading(true);
    try {
      let mediaUrl  = null;
      let mediaType = null;
      if (media) {
        setUploading(true);
        mediaUrl  = await upload(media.uri, 'questions');
        mediaType = media.type;
        setUploading(false);
      }

      const text = questionText.trim();

      await addDoc(collection(db, 'questions'), {
        text,
        authorId:   user.uid,
        authorName: profile?.displayName || user.displayName,
        authorRole: profile?.role,
        mediaUrl,
        mediaType,
        answered:   false,
        createdAt:  serverTimestamp(),
      });

      // @mention etiketlenen uzmanları bul ve bildirim gönder
      const mentions = [...text.matchAll(/@(\S+)/g)].map(m => m[1].toLowerCase());
      if (mentions.length > 0) {
        const tagged = experts.filter(e =>
          mentions.some(m => e.displayName.replace(/\s+/g, '').toLowerCase() === m)
        );
        for (const expert of tagged) {
          if (expert.expoPushToken) {
            await sendPushNotification(
              expert.expoPushToken,
              '📬 Size bir soru var!',
              `${profile?.displayName || 'Bir öğrenci'} size soru sordu: "${text.slice(0, 80)}${text.length > 80 ? '…' : ''}"`
            );
          }
        }
      }

      setQuestionText('');
      setMedia(null);
    } catch (e) {
      Alert.alert('Hata', 'Soru gönderilemedi: ' + e.message);
    } finally {
      setLoading(false);
      setUploading(false);
    }
  };

  // ── Yanıt gönder ──────────────────────────────────────────────────────────
  const sendReply = async (questionId, questionAuthorName) => {
    if (!replyText.trim()) return;
    setLoading(true);
    try {
      const text = replyText.trim();
      await addDoc(collection(db, 'questions', questionId, 'answers'), {
        text,
        authorId:   user.uid,
        authorName: profile?.displayName || user.displayName,
        authorRole: profile?.role,
        createdAt:  serverTimestamp(),
      });

      // Soru sahibine bildirim gönder
      const ownerSnap = await getDocs(
        query(collection(db, 'users'), where('displayName', '==', questionAuthorName))
      );
      if (!ownerSnap.empty) {
        const owner = ownerSnap.docs[0].data();
        if (owner.expoPushToken) {
          await sendPushNotification(
            owner.expoPushToken,
            '✅ Sorunuz yanıtlandı!',
            `${profile?.displayName} sorunuzu yanıtladı.`
          );
        }
      }

      setReplyText('');
      setReplyingTo(null);
    } finally {
      setLoading(false);
    }
  };

  // ── Soru sil ──────────────────────────────────────────────────────────────
  const deleteQuestion = (qId, authorId) => {
    if (!user || (authorId !== user.uid && profile?.role !== ROLES.ADMIN)) return;
    Alert.alert('Soruyu Sil', 'Emin misiniz?', [
      { text: 'İptal' },
      { text: 'Sil', style: 'destructive', onPress: () => deleteDoc(doc(db, 'questions', qId)) },
    ]);
  };

  // ── Soru kartı ────────────────────────────────────────────────────────────
  const renderQuestion = useCallback(({ item }) => {
    const isExpanded = expandedId === item.id;
    const isReplying = replyingTo === item.id;
    const canDelete  = user && (item.authorId === user.uid || profile?.role === ROLES.ADMIN);

    return (
      <View style={[s.card, SHADOWS.card]}>
        <View style={s.cardHeader}>
          <Avatar name={item.authorName} />
          <View style={s.cardHeaderText}>
            <Text style={s.authorName}>{item.authorName}</Text>
            <RoleBadge role={item.authorRole} />
          </View>
          <View style={s.cardHeaderRight}>
            <View style={[s.statusDot, { backgroundColor: item.answered ? '#10B981' : '#F59E0B' }]} />
            {canDelete && (
              <TouchableOpacity onPress={() => deleteQuestion(item.id, item.authorId)} style={{ padding: 4 }}>
                <Ionicons name="ellipsis-horizontal" size={17} color={COLORS.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <QuestionText text={item.text} />

        {item.mediaType === 'image' && item.mediaUrl && (
          <Image source={{ uri: item.mediaUrl }} style={s.questionMedia} resizeMode="cover" />
        )}
        {item.mediaType === 'video' && item.mediaUrl && (
          <Video source={{ uri: item.mediaUrl }} style={s.questionMedia} useNativeControls resizeMode="cover" />
        )}

        <View style={s.actionRow}>
          <View style={s.statusBadge}>
            <Ionicons
              name={item.answered ? 'checkmark-circle' : 'time-outline'}
              size={14}
              color={item.answered ? '#10B981' : '#F59E0B'}
            />
            <Text style={[s.statusText, { color: item.answered ? '#10B981' : '#F59E0B' }]}>
              {item.answered ? 'Yanıtlandı' : 'Yanıt Bekliyor'}
            </Text>
          </View>

          <View style={s.actionBtns}>
            <TouchableOpacity
              onPress={() => setExpandedId(isExpanded ? null : item.id)}
              style={s.actionChip}
            >
              <Ionicons name={isExpanded ? 'chatbubbles' : 'chatbubbles-outline'} size={14} color={COLORS.primaryMid} />
              <Text style={s.actionChipText}>Yanıtlar</Text>
            </TouchableOpacity>

            {canAnswer && (
              <TouchableOpacity
                onPress={() => setReplyingTo(isReplying ? null : item.id)}
                style={[s.actionChip, s.replyChip]}
              >
                <Ionicons name="pencil-outline" size={14} color={COLORS.white} />
                <Text style={[s.actionChipText, { color: COLORS.white }]}>Yanıtla</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {isExpanded && <AnswerList questionId={item.id} />}

        {isReplying && (
          <View style={s.replyBox}>
            <TextInput
              style={s.replyInput}
              placeholder="Yanıtınızı yazın..."
              placeholderTextColor={COLORS.textMuted}
              value={replyText}
              onChangeText={setReplyText}
              multiline
              autoFocus
            />
            <TouchableOpacity
              style={s.sendBtn}
              onPress={() => sendReply(item.id, item.authorName)}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={s.sendBtnText}>Gönder</Text>}
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }, [expandedId, replyingTo, replyText, loading, user?.uid, profile?.role]);

  // ── Mention modal ─────────────────────────────────────────────────────────
  const renderMentionModal = () => (
    <Modal
      visible={mentionModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setMentionModal(false)}
    >
      <View style={s.mentionModal}>
        <View style={s.mentionHandle} />
        <Text style={s.mentionTitle}>Uzman Etiketle</Text>
        <Text style={s.mentionSub}>Seçtiğiniz uzmana bildirim gidecektir</Text>
        <ScrollView>
          {[...experts]
            .sort((a, b) => {
              const aSpecial = SPECIAL_TITLES[a.displayName] ? 0 : 1;
              const bSpecial = SPECIAL_TITLES[b.displayName] ? 0 : 1;
              return aSpecial - bSpecial || a.displayName.localeCompare(b.displayName);
            })
            .map(e => (
            <TouchableOpacity
              key={e.id}
              style={s.mentionRow}
              onPress={() => addMention(e)}
            >
              <Avatar name={e.displayName} size={40} />
              <View style={{ flex: 1 }}>
                <Text style={s.mentionName}>{e.displayName}</Text>
                <Text style={s.mentionRole}>{expertTitle(e)}</Text>
              </View>
              <Ionicons name="at" size={20} color={COLORS.primaryMid} />
            </TouchableOpacity>
          ))}
        </ScrollView>
        <TouchableOpacity style={s.mentionClose} onPress={() => setMentionModal(false)}>
          <Text style={s.mentionCloseText}>Kapat</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );

  // ── Composer ──────────────────────────────────────────────────────────────
  const renderComposer = () => (
    <View style={[s.composer, SHADOWS.card]}>
      <View style={s.composerTop}>
        <Avatar name={profile?.displayName} />
        <TextInput
          style={s.composerInput}
          placeholder="Canlı türü mü? Bitki adı mı? @ ile uzman etiketle…"
          placeholderTextColor={COLORS.textMuted}
          value={questionText}
          onChangeText={setQuestionText}
          multiline
        />
      </View>

      {media?.type === 'image' && (
        <View style={s.previewWrap}>
          <Image source={{ uri: media.uri }} style={s.preview} resizeMode="cover" />
          <TouchableOpacity style={s.removeMedia} onPress={() => setMedia(null)}>
            <Ionicons name="close-circle" size={22} color={COLORS.white} />
          </TouchableOpacity>
        </View>
      )}
      {media?.type === 'video' && (
        <View style={s.previewWrap}>
          <Video source={{ uri: media.uri }} style={s.preview} useNativeControls resizeMode="cover" />
          <TouchableOpacity style={s.removeMedia} onPress={() => setMedia(null)}>
            <Ionicons name="close-circle" size={22} color={COLORS.white} />
          </TouchableOpacity>
        </View>
      )}

      <View style={s.composerFooter}>
        <View style={s.mediaRow}>
          <TouchableOpacity onPress={handlePickImage} style={s.mediaBtn}>
            <Ionicons name="image-outline" size={20} color={COLORS.primaryMid} />
            <Text style={s.mediaBtnLabel}>Fotoğraf</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handlePickVideo} style={s.mediaBtn}>
            <Ionicons name="videocam-outline" size={20} color={COLORS.primaryMid} />
            <Text style={s.mediaBtnLabel}>Video</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setMentionModal(true)} style={s.mediaBtn}>
            <Ionicons name="at" size={20} color={COLORS.primaryMid} />
            <Text style={s.mediaBtnLabel}>Uzman</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[s.askBtn, (!questionText.trim() && !media) && s.askBtnDisabled]}
          onPress={askQuestion}
          disabled={loading || (!questionText.trim() && !media)}
        >
          {loading ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <ActivityIndicator color="#fff" size="small" />
              {uploading && <Text style={s.askBtnText}>Yükleniyor…</Text>}
            </View>
          ) : (
            <Text style={s.askBtnText}>Sor</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={s.screen}>
      <View style={[s.header, { paddingTop: insets.top + 10 }]}>
        <View>
          <Text style={s.headerTitle}>Uzmana Sor</Text>
          <Text style={s.headerSub}>@ ile uzman etiketle, bildirim gitsin</Text>
        </View>
        <Ionicons name="leaf" size={26} color={COLORS.primaryLight} />
      </View>

      <FlatList
        data={questions}
        keyExtractor={item => item.id}
        renderItem={renderQuestion}
        ListHeaderComponent={
          <View style={{ paddingHorizontal: 14, paddingTop: 10, paddingBottom: 6 }}>
            {renderComposer()}
          </View>
        }
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      />

      {renderMentionModal()}
    </View>
  );
}

// ─── Yanıt listesi ────────────────────────────────────────────────────────────
function AnswerList({ questionId }) {
  const [answers, setAnswers] = useState([]);
  useEffect(() => {
    const q = query(
      collection(db, 'questions', questionId, 'answers'),
      orderBy('createdAt', 'asc')
    );
    return onSnapshot(q, snap =>
      setAnswers(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
  }, [questionId]);

  if (!answers.length)
    return <Text style={s.noAnswers}>Henüz yanıt yok.</Text>;

  return (
    <View style={s.answerList}>
      {answers.map(a => (
        <View key={a.id} style={s.answerCard}>
          <View style={s.answerHeader}>
            <Text style={s.answerAuthor}>{a.authorName}</Text>
            <View style={{ borderWidth: 1, borderColor: COLORS.primaryLight, borderRadius: 99, paddingHorizontal: 6, paddingVertical: 1 }}>
              <Text style={{ fontSize: 10, fontWeight: '600', color: COLORS.primaryMid }}>
                {ROLE_LABELS[a.authorRole] || a.authorRole}
              </Text>
            </View>
          </View>
          <Text style={s.answerText}>{a.text}</Text>
        </View>
      ))}
    </View>
  );
}

// ─── Stiller ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
    paddingHorizontal: 18, paddingBottom: 12,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1, borderBottomColor: COLORS.borderLight,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: COLORS.primary, letterSpacing: -0.5 },
  headerSub:   { fontSize: 12, color: COLORS.textMuted, marginTop: 1 },

  listContent: { paddingHorizontal: 14, paddingBottom: 100 },

  // Mention vurgu
  mentionText: { color: COLORS.primaryMid, fontWeight: '700' },

  // Composer
  composer:    { backgroundColor: COLORS.card, borderRadius: RADIUS.lg, padding: 14, marginBottom: 4 },
  composerTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  composerInput: {
    flex: 1, fontSize: 14, color: COLORS.textPrimary,
    minHeight: 52, lineHeight: 21, textAlignVertical: 'top',
  },
  previewWrap: { position: 'relative', marginBottom: 10 },
  preview:     { width: '100%', height: 180, borderRadius: RADIUS.md },
  removeMedia: { position: 'absolute', top: 6, right: 6, backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 99 },
  composerFooter: { gap: 10, marginTop: 2 },
  mediaRow:       { flexDirection: 'row', gap: 6 },
  mediaBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingVertical: 6, paddingHorizontal: 8,
    borderRadius: RADIUS.sm, backgroundColor: COLORS.primaryPale,
  },
  mediaBtnLabel: { fontSize: 12, color: COLORS.primaryMid, fontWeight: '600' },
  askBtn:         { backgroundColor: COLORS.primaryMid, paddingHorizontal: 22, paddingVertical: 9, borderRadius: RADIUS.full, alignSelf: 'flex-end' },
  askBtnDisabled: { backgroundColor: COLORS.textMuted },
  askBtnText:     { color: '#fff', fontWeight: '700', fontSize: 14 },

  // Kart
  card:           { backgroundColor: COLORS.card, borderRadius: RADIUS.lg, padding: 14, marginBottom: 12 },
  cardHeader:     { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  cardHeaderText: { flex: 1, gap: 3 },
  authorName:     { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  cardHeaderRight:{ flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusDot:      { width: 8, height: 8, borderRadius: 4 },
  questionText:   { fontSize: 15, color: COLORS.textPrimary, lineHeight: 22, marginBottom: 10 },
  questionMedia:  { width: '100%', height: 200, borderRadius: RADIUS.md, marginBottom: 10 },

  actionRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statusText:  { fontSize: 12, fontWeight: '600' },
  actionBtns:  { flexDirection: 'row', gap: 6 },
  actionChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1, borderColor: COLORS.primaryLight,
    borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 5,
  },
  replyChip:      { backgroundColor: COLORS.primaryMid, borderColor: COLORS.primaryMid },
  actionChipText: { fontSize: 12, fontWeight: '600', color: COLORS.primaryMid },

  replyBox: { marginTop: 12, gap: 8, borderTopWidth: 1, borderTopColor: COLORS.borderLight, paddingTop: 10 },
  replyInput: {
    borderWidth: 1, borderColor: COLORS.border,
    borderRadius: RADIUS.md, padding: 10,
    minHeight: 56, color: COLORS.textPrimary, fontSize: 14, lineHeight: 20,
  },
  sendBtn:     { backgroundColor: COLORS.primaryMid, borderRadius: RADIUS.md, padding: 10, alignItems: 'center' },
  sendBtnText: { color: '#fff', fontWeight: '700' },

  // Yanıtlar
  answerList:   { marginTop: 10, gap: 8, borderTopWidth: 1, borderTopColor: COLORS.borderLight, paddingTop: 10 },
  answerCard:   { backgroundColor: COLORS.primaryPale, borderRadius: RADIUS.md, padding: 10 },
  answerHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  answerAuthor: { fontSize: 12, fontWeight: '700', color: COLORS.primary },
  answerText:   { fontSize: 13, color: COLORS.textSecondary, lineHeight: 19 },
  noAnswers:    { color: COLORS.textMuted, fontSize: 13, marginTop: 8, textAlign: 'center' },

  // Mention modal
  mentionModal: { flex: 1, backgroundColor: COLORS.background, paddingHorizontal: 20, paddingTop: 12 },
  mentionHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: COLORS.border, alignSelf: 'center', marginBottom: 20,
  },
  mentionTitle: { fontSize: 20, fontWeight: '800', color: COLORS.primary, marginBottom: 4 },
  mentionSub:   { fontSize: 13, color: COLORS.textMuted, marginBottom: 20 },
  mentionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight,
  },
  mentionName:  { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  mentionRole:  { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  mentionClose: {
    marginTop: 20, paddingVertical: 14, alignItems: 'center',
    borderTopWidth: 1, borderTopColor: COLORS.borderLight,
  },
  mentionCloseText: { fontSize: 15, color: COLORS.textMuted, fontWeight: '600' },
});
