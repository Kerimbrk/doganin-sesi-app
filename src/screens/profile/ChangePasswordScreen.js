import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView
} from 'react-native';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { auth } from '../../config/firebase';
import { useAuth, nameToEmail } from '../../contexts/AuthContext';

export default function ChangePasswordScreen({ navigation }) {
  const { user, profile } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = async () => {
    if (!currentPassword.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      Alert.alert('Hata', 'Tüm alanları doldurun.');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Hata', 'Yeni şifre en az 6 karakter olmalıdır.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Hata', 'Yeni şifreler eşleşmiyor.');
      return;
    }

    setLoading(true);
    try {
      const email = nameToEmail(profile.displayName);
      const credential = EmailAuthProvider.credential(email, currentPassword.trim());
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      Alert.alert('Başarılı', 'Şifreniz güncellendi.', [
        { text: 'Tamam', onPress: () => navigation.goBack() }
      ]);
    } catch (e) {
      if (e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential') {
        Alert.alert('Hata', 'Mevcut şifreniz hatalı.');
      } else {
        Alert.alert('Hata', 'Şifre değiştirilemedi.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.inner}>
        <Text style={styles.title}>🔑 Şifre Değiştir</Text>

        <Text style={styles.label}>Mevcut Şifre</Text>
        <TextInput
          style={styles.input}
          placeholder="Mevcut şifreniz"
          value={currentPassword}
          onChangeText={setCurrentPassword}
          secureTextEntry
        />

        <Text style={styles.label}>Yeni Şifre</Text>
        <TextInput
          style={styles.input}
          placeholder="En az 6 karakter"
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry
        />

        <Text style={styles.label}>Yeni Şifre (Tekrar)</Text>
        <TextInput
          style={styles.input}
          placeholder="Yeni şifrenizi tekrar girin"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
        />

        <TouchableOpacity style={styles.button} onPress={handleChange} disabled={loading}>
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.buttonText}>Şifremi Güncelle</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.cancelText}>İptal</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fbe7' },
  inner: { padding: 24, paddingTop: 40 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#2e7d32', marginBottom: 28 },
  label: { fontSize: 13, color: '#555', fontWeight: '600', marginBottom: 6 },
  input: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14,
    marginBottom: 16, borderWidth: 1, borderColor: '#c8e6c9', fontSize: 15,
  },
  button: {
    backgroundColor: '#2e7d32', borderRadius: 12,
    padding: 16, alignItems: 'center', marginTop: 8,
  },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  cancelBtn: { padding: 16, alignItems: 'center', marginTop: 8 },
  cancelText: { color: '#888', fontSize: 15 },
});
