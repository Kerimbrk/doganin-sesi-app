import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, TextInput
} from 'react-native';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';

const QUESTIONS = [
  { key: 'q1', label: 'Etkinlik öncesi hazırlıklar (güvenlik, sağlık, malzeme vb.) yeterli miydi?' },
  { key: 'q2', label: 'Etkinlik proje hedeflerine katkı sağladı mı?' },
  { key: 'q3', label: 'Süreçte yaşanan bir aksaklık var mı? (program, konaklama vb.)' },
  { key: 'q4', label: 'Gelecek projeler için iyileştirme önerileriniz nelerdir?' },
];

const SCALE = ['1', '2', '3', '4', '5'];

export default function EvaluationFormScreen({ route, navigation }) {
  const { formId, eventName } = route.params;
  const [answers, setAnswers] = useState({ q1: '', q2: '', q3: '', q4: '' });
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const setAnswer = (key, val) => setAnswers((prev) => ({ ...prev, [key]: val }));

  const submit = async () => {
    const unanswered = QUESTIONS.filter((q) => !answers[q.key]);
    if (unanswered.length > 0 && !['q3', 'q4'].includes(unanswered[0].key)) {
      Alert.alert('Eksik', 'Lütfen tüm soruları yanıtlayın.');
      return;
    }
    setLoading(true);
    try {
      await updateDoc(doc(db, 'evaluationForms', formId), {
        answers,
        notes,
        pending: false,
        submittedAt: new Date().toISOString(),
      });
      Alert.alert('Teşekkürler!', 'Değerlendirmeniz kaydedildi.', [
        { text: 'Tamam', onPress: () => navigation.goBack() }
      ]);
    } catch (e) {
      Alert.alert('Hata', 'Kaydedilemedi: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>📋 Etkinlik Değerlendirmesi</Text>
      <Text style={styles.eventName}>{eventName}</Text>

      {QUESTIONS.slice(0, 2).map((q) => (
        <View key={q.key} style={styles.questionBlock}>
          <Text style={styles.questionLabel}>{q.label}</Text>
          <View style={styles.scaleRow}>
            {SCALE.map((s) => (
              <TouchableOpacity
                key={s}
                style={[styles.scaleBtn, answers[q.key] === s && styles.scaleBtnActive]}
                onPress={() => setAnswer(q.key, s)}
              >
                <Text style={[styles.scaleBtnText, answers[q.key] === s && styles.scaleBtnTextActive]}>
                  {s}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.scaleLabels}>
            <Text style={styles.scaleLabelText}>Yetersiz</Text>
            <Text style={styles.scaleLabelText}>Mükemmel</Text>
          </View>
        </View>
      ))}

      <View style={styles.questionBlock}>
        <Text style={styles.questionLabel}>{QUESTIONS[2].label}</Text>
        <TextInput
          style={styles.textArea}
          placeholder="Yaşandıysa kısaca açıklayın..."
          value={answers.q3}
          onChangeText={(v) => setAnswer('q3', v)}
          multiline
          numberOfLines={3}
        />
      </View>

      <View style={styles.questionBlock}>
        <Text style={styles.questionLabel}>{QUESTIONS[3].label}</Text>
        <TextInput
          style={styles.textArea}
          placeholder="Önerilerinizi yazın..."
          value={answers.q4}
          onChangeText={(v) => setAnswer('q4', v)}
          multiline
          numberOfLines={3}
        />
      </View>

      <TouchableOpacity style={styles.submitBtn} onPress={submit} disabled={loading}>
        {loading
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.submitBtnText}>Değerlendirmeyi Gönder</Text>
        }
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fbe7' },
  content: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#2e7d32', marginBottom: 4 },
  eventName: { fontSize: 14, color: '#777', marginBottom: 24 },
  questionBlock: { marginBottom: 24, backgroundColor: '#fff', borderRadius: 12, padding: 14, elevation: 1 },
  questionLabel: { fontSize: 14, color: '#333', fontWeight: '600', marginBottom: 12, lineHeight: 20 },
  scaleRow: { flexDirection: 'row', justifyContent: 'space-between' },
  scaleBtn: {
    width: 44, height: 44, borderRadius: 22, borderWidth: 2,
    borderColor: '#c8e6c9', justifyContent: 'center', alignItems: 'center'
  },
  scaleBtnActive: { backgroundColor: '#2e7d32', borderColor: '#2e7d32' },
  scaleBtnText: { fontWeight: 'bold', color: '#555' },
  scaleBtnTextActive: { color: '#fff' },
  scaleLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  scaleLabelText: { fontSize: 11, color: '#aaa' },
  textArea: {
    borderWidth: 1, borderColor: '#c8e6c9', borderRadius: 8,
    padding: 10, minHeight: 80, textAlignVertical: 'top', fontSize: 14
  },
  submitBtn: {
    backgroundColor: '#2e7d32', borderRadius: 12,
    padding: 16, alignItems: 'center', marginTop: 8
  },
  submitBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});
