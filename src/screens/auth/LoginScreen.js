import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';

export default function LoginScreen() {
  const { login } = useAuth();
  const [name,      setName]      = useState('');
  const [phone,     setPhone]     = useState('');
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');
  const [numericKb, setNumericKb] = useState(true);  // true = ilk giriş (tel no), false = değiştirilmiş şifre
  const [showPass,  setShowPass]  = useState(false);  // genel klavyede göster/gizle

  const handleLogin = async () => {
    setError('');
    if (!name.trim() || !phone.trim()) {
      setError('Ad soyad ve şifrenizi girin.');
      return;
    }
    if (numericKb && phone.trim().length !== 10) {
      setError('Telefon numarası 10 haneli olmalıdır (örn: 5551234567)');
      return;
    }
    setLoading(true);
    try {
      await login(name, phone);
    } catch {
      setError('Ad soyad veya şifre hatalı.');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setPhone('');
    setShowPass(false);
    setNumericKb(v => !v);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.inner}>
        <Text style={styles.logo}>🌿</Text>
        <Text style={styles.title}>Doğanın Sesi</Text>
        <Text style={styles.subtitle}>4004 Projesi</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TextInput
          style={styles.input}
          placeholder="Ad Soyad (örn: Kerim Burak Beyge)"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
          returnKeyType="next"
        />

        {/* İlk giriş — sayısal klavye, secureTextEntry YOK */}
        {numericKb && (
          <View style={styles.passwordRow}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Telefon No (örn: 5551234567)"
              value={phone}
              onChangeText={setPhone}
              keyboardType="number-pad"
              maxLength={10}
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />
            <TouchableOpacity style={styles.kbToggle} onPress={switchMode}>
              <Ionicons name="keypad-outline" size={20} color="#2e7d32" />
            </TouchableOpacity>
          </View>
        )}

        {/* Değiştirilmiş şifre — genel klavye, secureTextEntry AÇIK */}
        {!numericKb && (
          <View style={styles.passwordRow}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Şifreniz"
              value={phone}
              onChangeText={setPhone}
              keyboardType="default"
              secureTextEntry={!showPass}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />
            <TouchableOpacity style={styles.kbToggle} onPress={() => setShowPass(v => !v)}>
              <Ionicons
                name={showPass ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color="#2e7d32"
              />
            </TouchableOpacity>
            <TouchableOpacity style={styles.kbToggle} onPress={switchMode}>
              <Ionicons name="phone-portrait-outline" size={20} color="#2e7d32" />
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity onPress={switchMode}>
          <Text style={styles.kbHint}>
            {numericKb
              ? 'Şifreni değiştirdiysen → Genel klavyeye geç'
              : 'İlk kez giriş yapıyorsan → Sayısal klavyeye geç'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.buttonText}>Giriş Yap</Text>
          }
        </TouchableOpacity>

        <Text style={styles.hint}>
          Hesabınız yoksa proje yöneticisiyle iletişime geçin.
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f8e9' },
  inner:     { flex: 1, justifyContent: 'center', padding: 28 },
  logo:      { fontSize: 56, textAlign: 'center', marginBottom: 8 },
  title:     { fontSize: 32, fontWeight: 'bold', textAlign: 'center', color: '#2e7d32', marginBottom: 4 },
  subtitle:  { fontSize: 14, textAlign: 'center', color: '#888', marginBottom: 36 },
  input: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16,
    marginBottom: 14, borderWidth: 1, borderColor: '#c8e6c9', fontSize: 15,
  },
  passwordRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 12,
    borderWidth: 1, borderColor: '#c8e6c9',
    marginBottom: 6, paddingRight: 8,
  },
  passwordInput: {
    flex: 1, padding: 16, fontSize: 15,
  },
  kbToggle: { padding: 6 },
  kbHint: {
    fontSize: 12, color: '#2e7d32', textAlign: 'right',
    marginBottom: 18, textDecorationLine: 'underline',
  },
  button: {
    backgroundColor: '#2e7d32', borderRadius: 12,
    padding: 18, alignItems: 'center', marginTop: 4,
  },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  hint:  { textAlign: 'center', marginTop: 24, color: '#aaa', fontSize: 13 },
  error: { color: '#c62828', textAlign: 'center', marginBottom: 14, fontSize: 14 },
});
