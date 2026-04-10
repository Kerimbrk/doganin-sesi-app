import { useState, useEffect, useRef } from 'react';
import {
  View, Text, Modal, TouchableOpacity, StyleSheet,
  Dimensions, Animated, StatusBar, Image,
} from 'react-native';
import { Video } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../config/theme';

const { width: W, height: H } = Dimensions.get('window');
const STORY_DURATION = 5000;

function timeAgo(ts) {
  if (!ts?.toDate) return '';
  const diff = Date.now() - ts.toDate().getTime();
  if (diff < 60000)    return 'az önce';
  if (diff < 3600000)  return `${Math.floor(diff / 60000)} dk önce`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} sa önce`;
  return '1 günden eski';
}

function OverlayChip({ ov }) {
  return (
    <View
      style={[
        sv.overlayChip,
        { backgroundColor: ov.bg ?? 'rgba(0,0,0,0.45)' },
        { left: ov.x * W - 100, top: ov.y * H },
      ]}
      pointerEvents="none"
    >
      {ov.type === 'location' && (
        <Ionicons name="location" size={13} color={ov.color ?? '#fff'} />
      )}
      {ov.type === 'time' && (
        <Ionicons name="time-outline" size={13} color={ov.color ?? '#fff'} />
      )}
      <Text style={[sv.overlayChipText, { color: ov.color ?? '#fff' }]}>
        {ov.value}
      </Text>
    </View>
  );
}

export default function StoryViewerModal({ visible, stories = [], onClose, onSeen }) {
  const [index, setIndex] = useState(0);
  const progress = useRef(new Animated.Value(0)).current;
  const animRef  = useRef(null);
  const prevVisRef = useRef(false);

  // Açılışta index sıfırla
  useEffect(() => {
    if (visible && !prevVisRef.current) setIndex(0);
    prevVisRef.current = visible;
  }, [visible]);

  // Progress animasyonu
  useEffect(() => {
    if (!visible || !stories.length) return;
    const story = stories[index];
    if (!story) return;

    onSeen?.(story.id);
    progress.setValue(0);
    animRef.current?.stop();

    if (story.mediaType !== 'video') {
      animRef.current = Animated.timing(progress, {
        toValue: 1,
        duration: STORY_DURATION,
        useNativeDriver: false,
      });
      animRef.current.start(({ finished }) => {
        if (finished) goNext();
      });
    }

    return () => animRef.current?.stop();
  }, [index, visible, stories]);

  const goNext = () => {
    if (index < stories.length - 1) setIndex(i => i + 1);
    else onClose();
  };

  const goPrev = () => {
    if (index > 0) setIndex(i => i - 1);
  };

  const story = stories[index];
  if (!story) return null;

  const initials = (story.authorName || '?')
    .split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <StatusBar hidden />
      <View style={sv.container}>

        {/* Medya */}
        {story.mediaType === 'image' || !story.mediaType ? (
          <Image source={{ uri: story.mediaUrl }} style={sv.media} resizeMode="cover" />
        ) : (
          <Video
            source={{ uri: story.mediaUrl }}
            style={sv.media}
            resizeMode="cover"
            shouldPlay
            isLooping={false}
            onPlaybackStatusUpdate={status => {
              if (status.didJustFinish) goNext();
            }}
          />
        )}

        {/* Overlay elemanları (yazı / saat / konum) */}
        {(story.overlays ?? []).map(ov => (
          <OverlayChip key={ov.id} ov={ov} />
        ))}

        {/* Üst karartma */}
        <View style={sv.topScrim} />

        {/* Progress çubukları */}
        <View style={sv.topArea}>
          <View style={sv.progressRow}>
            {stories.map((_, i) => (
              <View key={i} style={sv.track}>
                <Animated.View
                  style={[
                    sv.fill,
                    {
                      width:
                        i < index
                          ? '100%'
                          : i === index
                            ? progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] })
                            : '0%',
                    },
                  ]}
                />
              </View>
            ))}
          </View>

          {/* Yazar satırı */}
          <View style={sv.authorRow}>
            <View style={sv.avatar}>
              <Text style={sv.avatarText}>{initials}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={sv.authorName}>{story.authorName}</Text>
              <Text style={sv.timeText}>{timeAgo(story.createdAt)}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={sv.closeBtn}>
              <Ionicons name="close" size={26} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Dokunma bölgeleri */}
        <View style={sv.tapRow} pointerEvents="box-none">
          <TouchableOpacity style={sv.tapLeft}  onPress={goPrev} activeOpacity={1} />
          <TouchableOpacity style={sv.tapRight} onPress={goNext} activeOpacity={1} />
        </View>
      </View>
    </Modal>
  );
}

const sv = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  media:     { position: 'absolute', top: 0, left: 0, width: W, height: H },

  topScrim: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 160,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  topArea: { paddingTop: 54, paddingHorizontal: 12 },

  progressRow: { flexDirection: 'row', gap: 4, marginBottom: 12 },
  track: {
    flex: 1, height: 2.5,
    backgroundColor: 'rgba(255,255,255,0.35)',
    borderRadius: 2, overflow: 'hidden',
  },
  fill: { height: '100%', backgroundColor: '#fff', borderRadius: 2 },

  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: COLORS.primaryMid,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#fff',
  },
  avatarText:  { color: '#fff', fontWeight: '700', fontSize: 13 },
  authorName:  { color: '#fff', fontWeight: '700', fontSize: 14 },
  timeText:    { color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 1 },
  closeBtn:    { padding: 6 },

  tapRow:   { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, flexDirection: 'row' },
  tapLeft:  { flex: 1 },
  tapRight: { flex: 2 },

  // Overlay elemanları
  overlayChip: {
    position: 'absolute',
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 999, maxWidth: 200,
  },
  overlayChipText: { fontWeight: '700', fontSize: 15 },
});
