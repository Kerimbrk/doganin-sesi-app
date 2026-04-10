import { ScrollView, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import i18n from '../../config/i18n';

const BADGES = [
  { key: 'explorer',    icon: '🥉', label: 'badges.explorer' },
  { key: 'interaction', icon: '🥈', label: 'badges.interaction' },
  { key: 'field_expert',icon: '🥇', label: 'badges.field_expert' },
  { key: 'art_soul',    icon: '💎', label: 'badges.art_soul' },
  { key: 'project_star',icon: '⭐', label: 'badges.project_star' },
];

export default function ProfileScreen({ navigation }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { profile, logout } = useAuth();

  const toggleLang = () => {
    i18n.changeLanguage(i18n.language === 'tr' ? 'en' : 'tr');
  };

  return (
    <ScrollView style={styles.container}>
      {/* Profil başlığı */}
      <View style={[styles.headerBox, { paddingTop: insets.top + 20 }]}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(profile?.displayName || 'U')[0].toUpperCase()}
          </Text>
        </View>
        <Text style={styles.name}>{profile?.displayName}</Text>
        <Text style={styles.role}>{t(`roles.${profile?.role}`)}</Text>
        <Text style={styles.points}>⭐ {profile?.points || 0} puan</Text>
      </View>

      {/* Rozetler */}
      <Text style={styles.sectionTitle}>{t('badges.title')}</Text>
      <View style={styles.badgeGrid}>
        {BADGES.map((badge) => {
          const earned = (profile?.badges || []).includes(badge.key);
          return (
            <View key={badge.key} style={[styles.badge, !earned && styles.badgeLocked]}>
              <Text style={styles.badgeIcon}>{badge.icon}</Text>
              <Text style={[styles.badgeLabel, !earned && styles.badgeLabelLocked]}>
                {t(badge.label)}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Ayarlar */}
      {profile?.role === 'admin' && (
        <>
          <Text style={styles.sectionTitle}>Yönetim</Text>
          <View style={styles.settingsBox}>
            <TouchableOpacity style={styles.settingsRow} onPress={() => navigation.navigate('Admin')}>
              <Text style={styles.settingsIcon}>👑</Text>
              <Text style={styles.settingsLabel}>Admin Paneli</Text>
              <Text style={styles.settingsArrow}>›</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      <Text style={styles.sectionTitle}>Ayarlar</Text>
      <View style={styles.settingsBox}>
        <TouchableOpacity style={styles.settingsRow} onPress={() => navigation.navigate('ChangePassword')}>
          <Text style={styles.settingsIcon}>🔑</Text>
          <Text style={styles.settingsLabel}>Şifre Değiştir</Text>
          <Text style={styles.settingsArrow}>›</Text>
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity style={styles.settingsRow} onPress={toggleLang}>
          <Text style={styles.settingsIcon}>🌐</Text>
          <Text style={styles.settingsLabel}>
            {i18n.language === 'tr' ? 'Switch to English' : 'Türkçeye Geç'}
          </Text>
          <Text style={styles.settingsArrow}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Çıkış */}
      <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
        <Text style={styles.logoutBtnText}>{t('auth.logout')}</Text>
      </TouchableOpacity>

      <View style={{ height: insets.bottom + 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fbe7' },
  headerBox: { alignItems: 'center', paddingBottom: 28, backgroundColor: '#2e7d32' },
  avatar: {
    width: 76, height: 76, borderRadius: 38,
    backgroundColor: '#a5d6a7', justifyContent: 'center',
    alignItems: 'center', marginBottom: 10,
  },
  avatarText: { fontSize: 34, fontWeight: 'bold', color: '#2e7d32' },
  name: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  role: { color: '#c8e6c9', marginTop: 4 },
  points: { color: '#fff', marginTop: 6, fontSize: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginHorizontal: 16, marginTop: 22, marginBottom: 10, color: '#444' },
  badgeGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 10 },
  badge: { width: '44%', backgroundColor: '#fff', borderRadius: 12, padding: 14, alignItems: 'center', elevation: 2 },
  badgeLocked: { opacity: 0.35 },
  badgeIcon: { fontSize: 28 },
  badgeLabel: { fontSize: 12, fontWeight: 'bold', marginTop: 6, textAlign: 'center', color: '#333' },
  badgeLabelLocked: { color: '#999' },
  settingsBox: { marginHorizontal: 16, backgroundColor: '#fff', borderRadius: 14, overflow: 'hidden', elevation: 2 },
  settingsRow: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  settingsIcon: { fontSize: 20, marginRight: 12 },
  settingsLabel: { flex: 1, fontSize: 15, color: '#333' },
  settingsArrow: { fontSize: 20, color: '#bbb' },
  divider: { height: 1, backgroundColor: '#f0f0f0', marginHorizontal: 16 },
  logoutBtn: { margin: 16, backgroundColor: '#ffebee', padding: 16, borderRadius: 12, alignItems: 'center' },
  logoutBtnText: { color: '#c62828', fontWeight: 'bold', fontSize: 15 },
});
