import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuth, ROLES } from '../../contexts/AuthContext';

const ROLE_OPTIONS = [
  { value: ROLES.STUDENT, labelKey: 'roles.student' },
  { value: ROLES.PARENT, labelKey: 'roles.parent' },
  { value: ROLES.VOLUNTEER, labelKey: 'roles.volunteer' },
];

export default function RegisterScreen({ navigation }) {
  const { t } = useTranslation();
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [role, setRole] = useState(ROLES.STUDENT);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRegister = async () => {
    setError('');
    setLoading(true);
    try {
      await register(email.trim(), password, name.trim(), inviteCode.trim(), role);
    } catch (e) {
      setError(e.message === 'invalid_invite' ? t('auth.invalid_invite') : t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>🌿 {t('auth.register')}</Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TextInput style={styles.input} placeholder={t('auth.name')} value={name} onChangeText={setName} />
      <TextInput style={styles.input} placeholder={t('auth.email')} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
      <TextInput style={styles.input} placeholder={t('auth.password')} value={password} onChangeText={setPassword} secureTextEntry />
      <TextInput style={styles.input} placeholder={t('auth.invite_code')} value={inviteCode} onChangeText={setInviteCode} autoCapitalize="characters" />

      <Text style={styles.label}>Rol Seçin:</Text>
      <View style={styles.roleRow}>
        {ROLE_OPTIONS.map((r) => (
          <TouchableOpacity
            key={r.value}
            style={[styles.roleBtn, role === r.value && styles.roleBtnActive]}
            onPress={() => setRole(r.value)}
          >
            <Text style={[styles.roleBtnText, role === r.value && styles.roleBtnTextActive]}>
              {t(r.labelKey)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{t('auth.register')}</Text>}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('Login')}>
        <Text style={styles.link}>{t('auth.have_account')} <Text style={styles.linkBold}>{t('auth.login')}</Text></Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', padding: 24, backgroundColor: '#f1f8e9' },
  title: { fontSize: 28, fontWeight: 'bold', textAlign: 'center', color: '#2e7d32', marginBottom: 24 },
  input: { backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#c8e6c9' },
  label: { color: '#555', marginBottom: 8, fontWeight: '600' },
  roleRow: { flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  roleBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#c8e6c9', backgroundColor: '#fff' },
  roleBtnActive: { backgroundColor: '#2e7d32', borderColor: '#2e7d32' },
  roleBtnText: { color: '#555' },
  roleBtnTextActive: { color: '#fff', fontWeight: 'bold' },
  button: { backgroundColor: '#2e7d32', borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 8 },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  link: { textAlign: 'center', marginTop: 20, color: '#555' },
  linkBold: { color: '#2e7d32', fontWeight: 'bold' },
  error: { color: 'red', textAlign: 'center', marginBottom: 10 },
});
