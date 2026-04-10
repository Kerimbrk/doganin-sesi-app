/**
 * StoryEditorModal
 * - Yazı / Saat / Konum ekleme
 * - Sürükle → konumlandır  (PanResponder + Animated.ValueXY)
 * - Metin üzerine tek tıkla → yeniden düzenle
 * - Uzun bas (600 ms) → sil
 * - inline=true → Modal sarmalayıcısız çalışır (iç içe Modal iOS sorunu)
 */
import { useState, useRef } from 'react';
import {
  View, Text, Modal, TouchableOpacity, StyleSheet, Image,
  TextInput, Keyboard, TouchableWithoutFeedback,
  Dimensions, Alert, StatusBar, ActivityIndicator,
  Animated, PanResponder,
} from 'react-native';
import { Video } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { COLORS, RADIUS } from '../../config/theme';

const { width: W, height: H } = Dimensions.get('window');

const TEXT_COLORS = ['#FFFFFF', '#000000', '#FFD700', '#FF6B6B', '#52B788', '#74C0FC'];
const BG_COLORS   = [
  'rgba(0,0,0,0.45)', 'rgba(45,106,79,0.7)',
  'rgba(220,38,38,0.6)', 'rgba(29,78,216,0.6)',
  'transparent',
];

// ─── Sürüklenebilir chip ──────────────────────────────────────────────────────

function DraggableChip({ ov, pan, onRemove, onEdit }) {
  const isDragging = useRef(false);
  const longTimer  = useRef(null);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder:        () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder:         () => true,

      onPanResponderGrant: () => {
        isDragging.current = false;
        pan.setOffset({ x: pan.x._value, y: pan.y._value });
        pan.setValue({ x: 0, y: 0 });

        longTimer.current = setTimeout(() => {
          pan.flattenOffset();
          onRemove(ov.id);
        }, 600);
      },

      onPanResponderMove: (evt, gs) => {
        if (Math.abs(gs.dx) > 5 || Math.abs(gs.dy) > 5) {
          isDragging.current = true;
          clearTimeout(longTimer.current);
        }
        Animated.event(
          [null, { dx: pan.x, dy: pan.y }],
          { useNativeDriver: false }
        )(evt, gs);
      },

      onPanResponderRelease: () => {
        clearTimeout(longTimer.current);
        pan.flattenOffset();

        // Ekran sınırları içinde tut
        const x = pan.x._value;
        const y = pan.y._value;
        const nx = Math.max(0, Math.min(W - 160, x));
        const ny = Math.max(80, Math.min(H - 80,  y));
        if (nx !== x || ny !== y) pan.setValue({ x: nx, y: ny });

        // Hareketsiz tıklama → metin ise düzenle
        if (!isDragging.current && ov.type === 'text') {
          onEdit(ov);
        }
      },

      onPanResponderTerminate: () => {
        clearTimeout(longTimer.current);
        pan.flattenOffset();
      },
    })
  ).current;

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[
        ed.overlayChip,
        { backgroundColor: ov.bg ?? 'rgba(0,0,0,0.45)' },
        { transform: [{ translateX: pan.x }, { translateY: pan.y }] },
      ]}
    >
      {ov.type === 'location' && <Ionicons name="location"     size={13} color={ov.color} />}
      {ov.type === 'time'     && <Ionicons name="time-outline" size={13} color={ov.color} />}
      <Text style={[ed.overlayChipText, { color: ov.color }]}>{ov.value}</Text>
    </Animated.View>
  );
}

// ─── Ana bileşen ──────────────────────────────────────────────────────────────

export default function StoryEditorModal({ visible, inline, media, onClose, onDone, uploading }) {
  const [overlays,   setOverlays]   = useState([]);
  const [textMode,   setTextMode]   = useState(false);
  const [draftText,  setDraftText]  = useState('');
  const [textColor,  setTextColor]  = useState('#FFFFFF');
  const [bgColor,    setBgColor]    = useState('rgba(0,0,0,0.45)');
  const [editingId,  setEditingId]  = useState(null);
  const [locLoading, setLocLoading] = useState(false);

  // id → Animated.ValueXY  (başlangıç konumu px cinsinden)
  const pans = useRef({});

  const addOverlay = (ov) => {
    const id = String(Date.now());
    // x/y oransal → piksel
    const initX = ov.x * W - 70;
    const initY = ov.y * H;
    pans.current[id] = new Animated.ValueXY({ x: initX, y: initY });
    setOverlays(prev => [...prev, { ...ov, id }]);
  };

  const removeOverlay = (id) => {
    delete pans.current[id];
    setOverlays(prev => prev.filter(o => o.id !== id));
  };

  // Metin düzenleme modunu aç (mevcut yazı için)
  const openEditText = (ov) => {
    setEditingId(ov.id);
    setDraftText(ov.value);
    setTextColor(ov.color ?? '#FFFFFF');
    setBgColor(ov.bg ?? 'rgba(0,0,0,0.45)');
    setTextMode(true);
  };

  // Yeni yazı modu
  const openNewText = () => {
    setEditingId(null);
    setDraftText('');
    setTextColor('#FFFFFF');
    setBgColor('rgba(0,0,0,0.45)');
    setTextMode(true);
  };

  const confirmText = () => {
    if (draftText.trim()) {
      if (editingId) {
        setOverlays(prev => prev.map(o =>
          o.id === editingId
            ? { ...o, value: draftText.trim(), color: textColor, bg: bgColor }
            : o
        ));
      } else {
        addOverlay({ type: 'text', value: draftText.trim(), color: textColor, bg: bgColor, x: 0.5, y: 0.42 });
      }
    }
    setDraftText('');
    setEditingId(null);
    setTextMode(false);
    Keyboard.dismiss();
  };

  const cancelText = () => {
    setDraftText('');
    setEditingId(null);
    setTextMode(false);
    Keyboard.dismiss();
  };

  const addTime = () => {
    if (overlays.find(o => o.type === 'time')) return;
    const val = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    addOverlay({ type: 'time', value: val, color: '#FFFFFF', bg: 'rgba(0,0,0,0.45)', x: 0.5, y: 0.12 });
  };

  const addLocation = async () => {
    if (overlays.find(o => o.type === 'location')) return;
    setLocLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { Alert.alert('İzin Gerekli', 'Konum erişimi reddedildi.'); return; }
      const loc   = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const [place] = await Location.reverseGeocodeAsync(loc.coords);
      const name  = place
        ? `${place.district || place.city || ''}, ${place.region || ''}`.trim().replace(/^,\s*/, '')
        : `${loc.coords.latitude.toFixed(3)}, ${loc.coords.longitude.toFixed(3)}`;
      addOverlay({ type: 'location', value: name, color: '#FFFFFF', bg: 'rgba(0,0,0,0.45)', x: 0.5, y: 0.21 });
    } catch { Alert.alert('Hata', 'Konum alınamadı.'); }
    finally { setLocLoading(false); }
  };

  // Paylaşmadan önce anlık pan konumlarını overlay'lere yaz
  const handleDone = () => {
    const finalOverlays = overlays.map(ov => {
      const pan = pans.current[ov.id];
      if (!pan) return ov;
      return {
        ...ov,
        x: Math.max(0, Math.min(1, (pan.x._value + 70) / W)),
        y: Math.max(0, Math.min(1,  pan.y._value        / H)),
      };
    });
    onDone(finalOverlays);
  };

  const handleClose = () => {
    setOverlays([]);
    setDraftText('');
    setTextMode(false);
    setEditingId(null);
    pans.current = {};
    onClose();
  };

  if (!media) return null;

  const content = (
    <>
      <StatusBar hidden />
      <View style={ed.container}>

        {/* Medya */}
        {media.type === 'image' ? (
          <Image source={{ uri: media.uri }} style={ed.media} resizeMode="cover" />
        ) : (
          <Video source={{ uri: media.uri }} style={ed.media} resizeMode="cover" shouldPlay isLooping isMuted />
        )}

        <View style={ed.topScrim} />

        {/* Sürüklenebilir overlay'ler */}
        {overlays.map(ov => {
          const pan = pans.current[ov.id];
          if (!pan) return null;
          return (
            <DraggableChip
              key={ov.id}
              ov={ov}
              pan={pan}
              onRemove={removeOverlay}
              onEdit={openEditText}
            />
          );
        })}

        {/* Yazı girişi / düzenleme paneli */}
        {textMode && (
          <TouchableWithoutFeedback onPress={cancelText}>
            <View style={ed.textOverlay}>
              <TouchableWithoutFeedback onPress={() => {}}>
                <View style={ed.textBox}>

                  {/* Yazı rengi */}
                  <View style={ed.colorRow}>
                    {TEXT_COLORS.map(c => (
                      <TouchableOpacity
                        key={c}
                        onPress={() => setTextColor(c)}
                        style={[ed.colorDot, { backgroundColor: c }, textColor === c && ed.colorDotSelected]}
                      />
                    ))}
                  </View>

                  {/* Arka plan rengi */}
                  <View style={ed.bgRow}>
                    {BG_COLORS.map(c => (
                      <TouchableOpacity
                        key={c}
                        onPress={() => setBgColor(c)}
                        style={[
                          ed.bgDot,
                          { backgroundColor: c === 'transparent' ? '#555' : c },
                          bgColor === c && ed.bgDotSelected,
                        ]}
                      >
                        {c === 'transparent' && <Ionicons name="close" size={10} color="#fff" />}
                      </TouchableOpacity>
                    ))}
                    <Text style={ed.bgLabel}>arka plan</Text>
                  </View>

                  <TextInput
                    style={[ed.textInput, { color: textColor, backgroundColor: bgColor }]}
                    value={draftText}
                    onChangeText={setDraftText}
                    placeholder="Bir şeyler yaz..."
                    placeholderTextColor="rgba(255,255,255,0.45)"
                    multiline
                    autoFocus
                    textAlign="center"
                  />

                  <TouchableOpacity style={ed.confirmBtn} onPress={confirmText}>
                    <Text style={ed.confirmBtnText}>{editingId ? 'Güncelle' : 'Ekle'}</Text>
                  </TouchableOpacity>

                  {editingId && (
                    <TouchableOpacity style={ed.cancelEditBtn} onPress={cancelText}>
                      <Text style={ed.cancelEditText}>İptal</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        )}

        {/* Üst araç çubuğu */}
        {!textMode && (
          <View style={ed.topBar}>
            <TouchableOpacity onPress={handleClose} style={ed.iconBtn}>
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
            <View style={ed.topTools}>
              <TouchableOpacity onPress={openNewText} style={ed.toolBtn}>
                <Text style={ed.aaText}>Aa</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={addTime} style={ed.toolBtn}>
                <Ionicons
                  name="time-outline" size={24}
                  color={overlays.find(o => o.type === 'time') ? COLORS.primaryXLight : '#fff'}
                />
              </TouchableOpacity>
              <TouchableOpacity onPress={addLocation} style={ed.toolBtn} disabled={locLoading}>
                {locLoading
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Ionicons
                      name="location-outline" size={24}
                      color={overlays.find(o => o.type === 'location') ? COLORS.primaryXLight : '#fff'}
                    />
                }
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Alt çubuk */}
        {!textMode && (
          <View style={ed.bottomBar}>
            {overlays.length > 0 && (
              <Text style={ed.hint}>{'Taşı: sürükle  •  Sil: uzun bas\nMetin: tek tıkla düzenle'}</Text>
            )}
            <TouchableOpacity
              style={[ed.shareBtn, uploading && ed.shareBtnDisabled]}
              onPress={handleDone}
              disabled={uploading}
            >
              {uploading
                ? <ActivityIndicator size="small" color="#fff" />
                : <>
                    <Text style={ed.shareBtnText}>Paylaş</Text>
                    <Ionicons name="paper-plane-outline" size={18} color="#fff" />
                  </>
              }
            </TouchableOpacity>
          </View>
        )}

      </View>
    </>
  );

  if (inline) return content;

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent onRequestClose={handleClose}>
      {content}
    </Modal>
  );
}

// ─── Stiller ──────────────────────────────────────────────────────────────────

const ed = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  media:     { position: 'absolute', top: 0, left: 0, width: W, height: H },
  topScrim:  {
    position: 'absolute', top: 0, left: 0, right: 0, height: 140,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },

  // Üst araç çubuğu
  topBar: {
    position: 'absolute', top: 52, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 12,
  },
  topTools: { flexDirection: 'row', gap: 4 },
  iconBtn:  { padding: 8 },
  toolBtn:  { padding: 8 },
  aaText:   { color: '#fff', fontWeight: '800', fontSize: 20, letterSpacing: 0.5 },

  // Sürüklenebilir öğeler — position: absolute + transform ile konumlanır
  overlayChip: {
    position: 'absolute',
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: RADIUS.full,
    maxWidth: 220,
    // top/left KULLANILMIYOR — transform: translateX/Y ile konumlanır
  },
  overlayChipText: { fontWeight: '700', fontSize: 15 },

  // Yazı paneli
  textOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center', alignItems: 'center',
  },
  textBox: { width: W * 0.88, alignItems: 'center', gap: 14 },

  colorRow: { flexDirection: 'row', gap: 10 },
  colorDot: {
    width: 26, height: 26, borderRadius: 13,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)',
  },
  colorDotSelected: { borderColor: '#fff', borderWidth: 3, transform: [{ scale: 1.2 }] },

  bgRow:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bgDot:  {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.4)',
    justifyContent: 'center', alignItems: 'center',
  },
  bgDotSelected: { borderColor: '#fff', borderWidth: 2.5 },
  bgLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 11 },

  textInput: {
    fontSize: 22, fontWeight: '700', textAlign: 'center',
    width: '100%', minHeight: 60,
    paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: RADIUS.md,
  },
  confirmBtn: {
    backgroundColor: COLORS.primaryMid,
    paddingHorizontal: 36, paddingVertical: 11,
    borderRadius: RADIUS.full,
  },
  confirmBtnText:  { color: '#fff', fontWeight: '700', fontSize: 15 },
  cancelEditBtn:   { paddingVertical: 8 },
  cancelEditText:  { color: 'rgba(255,255,255,0.6)', fontSize: 14 },

  // Alt çubuk
  bottomBar: {
    position: 'absolute', bottom: 48, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
    paddingHorizontal: 20,
  },
  hint: { color: 'rgba(255,255,255,0.55)', fontSize: 11, lineHeight: 16, flexShrink: 1, marginRight: 12 },
  shareBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: COLORS.primaryMid,
    paddingHorizontal: 24, paddingVertical: 13,
    borderRadius: RADIUS.full,
    minWidth: 110, justifyContent: 'center',
  },
  shareBtnDisabled: { opacity: 0.55 },
  shareBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
