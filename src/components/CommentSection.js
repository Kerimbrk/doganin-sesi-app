import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator
} from 'react-native';
import {
  collection, addDoc, onSnapshot, orderBy,
  query, serverTimestamp, deleteDoc, doc
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth, ROLES } from '../contexts/AuthContext';

export default function CommentSection({ postId }) {
  const { user, profile } = useAuth();
  const [comments, setComments] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const q = query(
      collection(db, 'posts', postId, 'comments'),
      orderBy('createdAt', 'asc')
    );
    return onSnapshot(q, (snap) => {
      setComments(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, [postId]);

  const sendComment = async () => {
    if (!text.trim() || !user) return;
    setSending(true);
    try {
      await addDoc(collection(db, 'posts', postId, 'comments'), {
        text: text.trim(),
        authorId: user.uid,
        authorName: profile?.displayName || user.displayName,
        authorRole: profile?.role,
        createdAt: serverTimestamp(),
      });
      setText('');
    } finally {
      setSending(false);
    }
  };

  const deleteComment = async (commentId, authorId) => {
    const canDelete =
      authorId === user.uid || profile?.role === ROLES.ADMIN;
    if (!canDelete) return;
    await deleteDoc(doc(db, 'posts', postId, 'comments', commentId));
  };

  return (
    <View style={styles.container}>
      {comments.map((c) => (
        <View key={c.id} style={styles.comment}>
          <View style={styles.commentHeader}>
            <Text style={styles.commentAuthor}>{c.authorName}</Text>
            {(c.authorId === user.uid || profile?.role === ROLES.ADMIN) && (
              <TouchableOpacity onPress={() => deleteComment(c.id, c.authorId)}>
                <Text style={styles.deleteBtn}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.commentText}>{c.text}</Text>
        </View>
      ))}

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Yorum yaz..."
          value={text}
          onChangeText={setText}
          multiline
        />
        <TouchableOpacity style={styles.sendBtn} onPress={sendComment} disabled={sending}>
          {sending
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={styles.sendBtnText}>↑</Text>
          }
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 10, borderTopWidth: 1, borderTopColor: '#f0f0f0', paddingTop: 8 },
  comment: { marginBottom: 8, backgroundColor: '#f9fbe7', borderRadius: 8, padding: 8 },
  commentHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  commentAuthor: { fontSize: 12, fontWeight: 'bold', color: '#2e7d32' },
  deleteBtn: { color: '#ccc', fontSize: 12 },
  commentText: { fontSize: 13, color: '#444' },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 6 },
  input: {
    flex: 1, backgroundColor: '#f5f5f5', borderRadius: 10,
    padding: 8, fontSize: 13, maxHeight: 80,
    borderWidth: 1, borderColor: '#e0e0e0'
  },
  sendBtn: {
    backgroundColor: '#2e7d32', width: 36, height: 36,
    borderRadius: 18, justifyContent: 'center', alignItems: 'center'
  },
  sendBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});
