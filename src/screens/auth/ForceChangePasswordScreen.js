import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, Alert
} from 'react-native';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import * as Notifications from 'expo-notifications';
import { db } from '../../config/firebase';
import { useAuth, nameToEmail } from '../../contexts/AuthContext';

export default function ForceChangePasswordScreen() {
  const { user, profile } = useAuth();
  const [currentPhone,    setCurrentPhone]    = useState('');
  const [newPassword,     setNewPassword]     = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading,         setLoading]         = useState(false);

  const handleChange = async () => {
    if (!currentPhone.trim() || !newPassword.trim() || !confirmPassword.trim()) {
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
    if (newPassword === currentPhone.trim()) {
      Alert.alert('Hata', 'Yeni şifre mevcut telefon numaranızdan farklı olmalıdır.');
      return;
    }

    setLoading(true);
    try {
      const email      = nameToEmail(profile.displayName);
      const credential = EmailAuthProvider.credential(email, currentPhone.trim());
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      await updateDoc(doc(db, 'users', user.uid), { passwordChanged: true });

      // Bildirim gönder
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🔐 Şifreniz Güncellendi',
          body:  'Doğanın Sesi hesabınızın şifresi başarıyla değiştirildi.',
        },
        trigger: null, // hemen gönder
      });

      Alert.alert('Başarılı ✅', 'Şifreniz güncellendi. Artık yeni şifrenizle giriş yapabilirsiniz.');
    } catch (e) {
      if (e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential') {
        Alert.alert('Hata', 'Mevcut telefon numaranız hatalı.');
      } else {
        Alert.alert('Hata', 'Şifre değiştirilemedi: ' + e.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.inner}>
        <Text style={styles.icon}>🔐</Text>
        <Text style={styles.title}>Şifrenizi Belirleyin</Text>
        <Text style={styles.subtitle}>
          Güvenliğiniz için ilk girişte kişisel şifrenizi oluşturmanız gerekmektedir.
        </Text>

        <Text style={styles.label}>Mevcut Şifre (Telefon Numaranız)</Text>
        <TextInput
          style={styles.input}
          placeholder="5XXXXXXXXX"
          value={currentPhone}
          onChangeText={setCurrentPhone}
          keyboardType="number-pad"
          maxLength={10}
          secureTextEntry
        />

        <Text style={styles.label}>Yeni Şifre</Text>
        <TextInput
          style={styles.input}
          placeholder="En az 6 karakter"
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
        />

        <Text style={styles.label}>Yeni Şifre (Tekrar)</Text>
        <TextInput
          style={styles.input}
          placeholder="Yeni şifrenizi tekrar girin"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
        />

        <TouchableOpacity style={styles.button} onPress={handleChange} disabled={loading}>
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.buttonText}>Şifremi Güncelle</Text>
          }
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f8e9' },
  inner:     { flex: 1, justifyContent: 'center', padding: 28 },
  icon:      { fontSize: 48, textAlign: 'center', marginBottom: 10 },
  title:     { fontSize: 24, fontWeight: 'bold', textAlign: 'center', color: '#2e7d32', marginBottom: 8 },
  subtitle:  { fontSize: 13, textAlign: 'center', color: '#777', marginBottom: 28, lineHeight: 20 },
  label:     { fontSize: 13, color: '#555', fontWeight: '600', marginBottom: 6 },
  input: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14,
    marginBottom: 16, borderWidth: 1, borderColor: '#c8e6c9', fontSize: 15,
  },
  button: {
    backgroundColor: '#2e7d32', borderRadius: 12,
    padding: 16, alignItems: 'center', marginTop: 8,
  },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});
