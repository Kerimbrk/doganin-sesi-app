import { useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  Alert, ActivityIndicator, TextInput, Modal, ScrollView,
} from 'react-native';
import {
  collection, onSnapshot, doc, updateDoc, setDoc, serverTimestamp,
} from 'firebase/firestore';
import { createUserWithEmailAndPassword, signOut as fbSignOut } from 'firebase/auth';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { db, auth2 } from '../../config/firebase';
import { ROLES, nameToEmail } from '../../contexts/AuthContext';
import { COLORS, RADIUS, SHADOWS } from '../../config/theme';

const ROLE_LIST = Object.values(ROLES);
const ROLE_LABELS = {
  admin:     '👑 Süper Yetkili',
  trainer:   '🎓 Eğitmen',
  guide:     '🧭 Rehber',
  volunteer: '🙋 Gönüllü',
  student:   '📚 Öğrenci',
  parent:    '👨‍👩‍👧 Veli',
};

// Oluşturulabilecek roller (admin kendisi oluşturmaz)
const CREATABLE_ROLES = [
  { value: ROLES.TRAINER,   label: '🎓 Eğitmen' },
  { value: ROLES.GUIDE,     label: '🧭 Rehber' },
  { value: ROLES.VOLUNTEER, label: '🙋 Gönüllü' },
  { value: ROLES.STUDENT,   label: '📚 Öğrenci' },
  { value: ROLES.PARENT,    label: '👨‍👩‍👧 Veli' },
];

export default function AdminScreen() {
  const insets = useSafeAreaInsets();
  const [users,   setUsers]   = useState([]);
  const [loading, setLoading] = useState(false);

  // Yeni kullanıcı formu
  const [formVisible, setFormVisible] = useState(false);
  const [formName,    setFormName]    = useState('');
  const [formPhone,   setFormPhone]   = useState('');
  const [formRole,    setFormRole]    = useState(ROLES.TRAINER);
  const [creating,    setCreating]    = useState(false);

  useEffect(() => {
    return onSnapshot(collection(db, 'users'), (snap) => {
      setUsers(
        snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => a.displayName?.localeCompare(b.displayName))
      );
    });
  }, []);

  // ── Kullanıcı oluştur ─────────────────────────────────────────────────────
  const createUser = async () => {
    const name  = formName.trim();
    const phone = formPhone.trim();

    if (!name || !phone) {
      Alert.alert('Hata', 'Ad soyad ve telefon numarasını girin.');
      return;
    }
    if (phone.length < 9 || phone.length > 11 || !/^\d+$/.test(phone)) {
      Alert.alert('Hata', 'Telefon numarası 9-11 haneli olmalıdır (TR: 5551234567)');
      return;
    }

    setCreating(true);
    try {
      const email = nameToEmail(name);

      // İkincil auth ile oluştur — ana admin oturumu bozulmaz
      const cred = await createUserWithEmailAndPassword(auth2, email, phone);
      const uid  = cred.user.uid;

      // İkincil oturumu hemen kapat
      await fbSignOut(auth2);

      // Firestore'a kullanıcı belgesi oluştur
      await setDoc(doc(db, 'users', uid), {
        displayName:     name,
        email,
        role:            formRole,
        points:          0,
        badges:          [],
        passwordChanged: false,   // ilk girişte şifre değiştirme ekranı açılır
        createdAt:       serverTimestamp(),
      });

      setFormName('');
      setFormPhone('');
      setFormRole(ROLES.TRAINER);
      setFormVisible(false);
      Alert.alert(
        'Hesap Oluşturuldu ✅',
        `${name} adına hesap açıldı.\n\nKullanıcı adı: ${name}\nİlk şifre: ${phone}\n\nİlk girişte şifre değiştirme ekranı gelecektir.`
      );
    } catch (e) {
      if (e.code === 'auth/email-already-in-use') {
        Alert.alert('Hata', 'Bu isimde bir kullanıcı zaten var.');
      } else {
        Alert.alert('Hata', 'Hesap oluşturulamadı: ' + e.message);
      }
    } finally {
      setCreating(false);
    }
  };

  // ── Rol değiştir ──────────────────────────────────────────────────────────
  const changeRole = (userId, currentRole, displayName) => {
    Alert.alert(`${displayName} — Rol Değiştir`, 'Yeni rolü seçin:', [
      ...ROLE_LIST
        .filter((r) => r !== currentRole)
        .map((r) => ({
          text: ROLE_LABELS[r],
          onPress: async () => {
            setLoading(true);
            try { await updateDoc(doc(db, 'users', userId), { role: r }); }
            finally { setLoading(false); }
          },
        })),
      { text: 'İptal', style: 'cancel' },
    ]);
  };

  // ── Kullanıcı kartı ───────────────────────────────────────────────────────
  const renderUser = ({ item }) => (
    <View style={st.userCard}>
      <View style={st.userAvatar}>
        <Text style={st.userAvatarText}>{(item.displayName || 'U')[0].toUpperCase()}</Text>
      </View>
      <View style={st.userInfo}>
        <Text style={st.userName}>{item.displayName}</Text>
        <Text style={st.userRole}>{ROLE_LABELS[item.role] || item.role}</Text>
        <Text style={st.userPoints}>⭐ {item.points || 0} puan</Text>
        {item.passwordChanged === false && (
          <View style={st.pwBadge}>
            <Text style={st.pwBadgeText}>Şifre değiştirilmedi</Text>
          </View>
        )}
      </View>
      <TouchableOpacity
        style={st.changeRoleBtn}
        onPress={() => changeRole(item.id, item.role, item.displayName)}
      >
        <Text style={st.changeRoleBtnText}>Rol{'\n'}Değiştir</Text>
      </TouchableOpacity>
    </View>
  );

  // ── Form modal ────────────────────────────────────────────────────────────
  const renderForm = () => (
    <Modal
      visible={formVisible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setFormVisible(false)}
    >
      <ScrollView
        style={st.formScroll}
        contentContainerStyle={[st.formContainer, { paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={st.formHandle} />
        <Text style={st.formTitle}>Yeni Kullanıcı Oluştur</Text>
        <Text style={st.formSub}>
          İlk şifre olarak telefon numarası kullanılır.{'\n'}
          Kullanıcı ilk girişte şifresini değiştirmek zorundadır.
        </Text>

        <Text style={st.label}>Ad Soyad</Text>
        <TextInput
          style={st.input}
          placeholder="örn: Mustafa Sabur"
          value={formName}
          onChangeText={setFormName}
          autoCapitalize="words"
        />

        <Text style={st.label}>Telefon No (İlk Şifre)</Text>
        <TextInput
          style={st.input}
          placeholder="5XXXXXXXXX (TR: 10 hane, INT: 9-11 hane)"
          value={formPhone}
          onChangeText={setFormPhone}
          keyboardType="number-pad"
          maxLength={11}
        />

        <Text style={st.label}>Rol</Text>
        <View style={st.roleGrid}>
          {CREATABLE_ROLES.map(r => (
            <TouchableOpacity
              key={r.value}
              style={[st.roleChip, formRole === r.value && st.roleChipActive]}
              onPress={() => setFormRole(r.value)}
            >
              <Text style={[st.roleChipText, formRole === r.value && st.roleChipTextActive]}>
                {r.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[st.createBtn, creating && st.createBtnDisabled]}
          onPress={createUser}
          disabled={creating}
        >
          {creating
            ? <ActivityIndicator color="#fff" />
            : <Text style={st.createBtnText}>Hesap Oluştur</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity style={st.cancelBtn} onPress={() => setFormVisible(false)}>
          <Text style={st.cancelBtnText}>İptal</Text>
        </TouchableOpacity>
      </ScrollView>
    </Modal>
  );

  return (
    <View style={st.container}>
      <View style={[st.topBar, { paddingTop: insets.top + 12 }]}>
        <View>
          <Text style={st.header}>👑 Admin Paneli</Text>
          <Text style={st.subHeader}>{users.length} kullanıcı</Text>
        </View>
        <TouchableOpacity style={st.addBtn} onPress={() => setFormVisible(true)}>
          <Ionicons name="person-add-outline" size={18} color="#fff" />
          <Text style={st.addBtnText}>Ekle</Text>
        </TouchableOpacity>
      </View>

      {loading && <ActivityIndicator color={COLORS.primaryMid} style={{ marginVertical: 8 }} />}

      <FlatList
        data={users}
        keyExtractor={(item) => item.id}
        renderItem={renderUser}
        contentContainerStyle={{ paddingBottom: 100 }}
      />

      {renderForm()}
    </View>
  );
}

const st = StyleSheet.create({
  container:  { flex: 1, backgroundColor: '#f9fbe7' },
  topBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
    paddingHorizontal: 16, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: COLORS.borderLight,
    backgroundColor: '#f9fbe7',
  },
  header:    { fontSize: 22, fontWeight: 'bold', color: '#2e7d32' },
  subHeader: { fontSize: 13, color: '#888', marginTop: 2 },

  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.primaryMid,
    paddingHorizontal: 14, paddingVertical: 9,
    borderRadius: RADIUS.full,
    ...SHADOWS.button,
  },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  userCard: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 12, marginTop: 10,
    backgroundColor: '#fff', borderRadius: 12, padding: 12, elevation: 2,
  },
  userAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#c8e6c9', justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  userAvatarText: { fontSize: 18, fontWeight: 'bold', color: '#2e7d32' },
  userInfo:   { flex: 1 },
  userName:   { fontWeight: 'bold', color: '#333', fontSize: 15 },
  userRole:   { color: '#666', fontSize: 12, marginTop: 2 },
  userPoints: { color: '#888', fontSize: 11, marginTop: 1 },
  pwBadge: {
    marginTop: 4, alignSelf: 'flex-start',
    backgroundColor: '#FEF3C7', borderRadius: 99,
    paddingHorizontal: 7, paddingVertical: 2,
  },
  pwBadgeText: { fontSize: 10, color: '#92400E', fontWeight: '600' },

  changeRoleBtn: {
    backgroundColor: '#e8f5e9', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 8, alignItems: 'center',
  },
  changeRoleBtnText: { color: '#2e7d32', fontSize: 11, fontWeight: 'bold', textAlign: 'center' },

  // Form
  formScroll:     { flex: 1, backgroundColor: COLORS.background },
  formContainer:  { paddingHorizontal: 20, paddingTop: 12 },
  formHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: COLORS.border, alignSelf: 'center', marginBottom: 20,
  },
  formTitle: { fontSize: 22, fontWeight: '800', color: COLORS.primary, marginBottom: 6 },
  formSub:   { fontSize: 13, color: COLORS.textMuted, marginBottom: 24, lineHeight: 19 },

  label: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 6 },
  input: {
    backgroundColor: '#fff', borderRadius: RADIUS.md, padding: 14,
    borderWidth: 1, borderColor: COLORS.border,
    fontSize: 15, color: COLORS.textPrimary, marginBottom: 18,
  },

  roleGrid:        { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 28 },
  roleChip: {
    borderWidth: 1.5, borderColor: COLORS.border,
    borderRadius: RADIUS.full, paddingHorizontal: 14, paddingVertical: 8,
  },
  roleChipActive:     { backgroundColor: COLORS.primaryMid, borderColor: COLORS.primaryMid },
  roleChipText:       { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  roleChipTextActive: { color: '#fff' },

  createBtn: {
    backgroundColor: COLORS.primaryMid, borderRadius: RADIUS.full,
    paddingVertical: 15, alignItems: 'center', marginBottom: 12,
  },
  createBtnDisabled: { opacity: 0.6 },
  createBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  cancelBtn:     { paddingVertical: 12, alignItems: 'center' },
  cancelBtnText: { color: COLORS.textMuted, fontSize: 14 },
});
