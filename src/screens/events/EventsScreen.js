import { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, LayoutAnimation, UIManager, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import * as Notifications from 'expo-notifications';
import { db } from '../../config/firebase';
import { useAuth, ROLES } from '../../contexts/AuthContext';
import { COLORS, SHADOWS, RADIUS } from '../../config/theme';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true, shouldPlaySound: true, shouldSetBadge: false,
  }),
});

// ── Kamp Günleri ──────────────────────────────────────────────────────────────

const DAYS = [
  { key: '1', label: '1. Gün', date: '29 Haz' },
  { key: '2', label: '2. Gün', date: '30 Haz' },
  { key: '3', label: '3. Gün', date: '1 Tem' },
  { key: '4', label: '4. Gün', date: '2 Tem' },
  { key: '5', label: '5. Gün', date: '3 Tem' },
];

// ── Etkinlik Programı ─────────────────────────────────────────────────────────
// Kaynak: 4004_939639_ETKINLIK_PROGRAMI + 4004_proje_oneri_formu_2024_1_V2
// Proje ID: 939639 | Proje Adı: Doğanın Sesi: İklim Değişikliğini Anlamak ve Öğrenmek

const EVENTS = [

  // ── 1. GÜN · 29 Haziran · Soma BİLSEM → Sevişler Baraj Gölü ─────────────────
  {
    id: 'e1', day: '1', no: 1,
    name: 'Kayıt İşlemleri',
    educator: 'Kerim Burak BEYGE (Proje Yürütücüsü)',
    time: '10:00–11:00', venue: 'Soma Bilim ve Sanat Merkezi',
    description:
      'Yapılan seçim sonucunda asil olarak katılımcı listesinde olan katılımcıların kayıtlarının yapılması ve promosyon ürünlerin (kamp tişörtü, şapka, not defteri vb.) katılımcılara dağıtılması.',
    completed: false,
  },
  {
    id: 'e2', day: '1', no: 2,
    name: 'Açılış Töreni',
    educator: 'Doç. Dr. Taner ÖZCAN (Proje Uzmanı) · Kerim Burak BEYGE',
    time: '11:00–12:00', venue: 'Soma Bilim ve Sanat Merkezi',
    description:
      'Açılış töreni ve proje hakkında detaylı bilgi verilmesi. Proje ekibinin ve eğitmenlerin tanıtımı, kamp programının aktarılması. Katılımcılar dört kişilik gruplara ayrılır; her gruba bir rehber öğretmen atanır.',
    completed: false,
  },
  {
    id: 'e3', day: '1', no: 3,
    name: 'Ölçeklerin Uygulanması',
    educator: 'Kerim Burak BEYGE (Proje Yürütücüsü)',
    time: '13:30–14:30', venue: 'Soma Bilim ve Sanat Merkezi',
    description:
      'Hazırlanan projenin öğrencilerde iklim değişikliği farkındalığı farklılığını ölçmek amacıyla Ataklı ve Kuran (2022) tarafından geliştirilen "İklim Değişikliği Farkındalığı" ölçeğinin katılımcılara ön test olarak uygulanması.',
    completed: false,
  },
  {
    id: 'e4', day: '1', no: 4,
    name: 'Kırmızı Mercanlar',
    educator: 'Prof. Dr. Dilek TÜRKER (Balıkesir Üniversitesi)',
    time: '15:30–17:00', venue: 'Sevişler Baraj Gölü Eğitim Alanı',
    description:
      'Öğrencilere omurgasız canlılar hakkında genel bilgi verdikten sonra, iklim değişikliğinin kırmızı mercanlar üzerindeki etkilerini, bu mercanların ekosistemler için önemini, yaşam alanlarını ve korunmaları için alınması gereken tedbirleri anlatmak. Deniz çayırlarını tanıtarak, iklim değişikliğinin bu hassas ekosistemler üzerindeki olumsuz etkilerini kavratmak ve koruma gerekliliklerini vurgulamak.',
    completed: false,
  },
  {
    id: 'e5', day: '1', no: 5,
    name: 'Balıklarımıza Dokunuyorum',
    educator: 'Prof. Dr. Dilek TÜRKER (Balıkesir Üniversitesi)',
    time: '17:00–18:30', venue: 'Sevişler Baraj Gölü Eğitim Alanı',
    description:
      'Öğrencilere temel sistematik bilgisi, tür tanımı ve isimlendirme kuralları hakkında bilgi vermek; ülkemiz denizlerinde dağılım gösteren balık türlerini ve bu türlerin iklim değişikliği süreçlerindeki değişimlerini öğretmek. Tehlikeli türler hakkında güvenlik önlemlerini öğretirken, iklim değişikliği nedeniyle ortaya çıkan yeni tehlikeler ve bu durumların ekosistem üzerindeki etkilerini kavratmak.',
    completed: false,
  },
  {
    id: 'e6', day: '1', no: 6,
    name: 'Katılımcıların Odalara Yerleşmesi',
    educator: 'Kerim Burak BEYGE · Tüm Rehberler',
    time: '19:00–20:00', venue: 'Soma Borsa İstanbul Fen Lisesi Pansiyonu',
    description:
      'Tüm katılımcı öğrencilerinin ve refakatçi rehber öğretmenlerin odalara yerleşmesi. Her odadan sorumlu rehber belirlenir; konaklama kuralları ve acil durum iletişim numaraları paylaşılır.',
    completed: false,
  },

  // ── 2. GÜN · 30 Haziran · Kırkağaç Çam Korusu ───────────────────────────────
  {
    id: 'e7', day: '2', no: 7,
    name: 'Doğanın Sesi',
    educator: 'Mustafa SABUR (Müzik Öğretmeni)',
    time: '10:00–11:30', venue: 'Kırkağaç Çam Korusu',
    description:
      'Öğrencilerin doğa ve müzik arasındaki ilişkiyi keşfetmelerini ve yaratıcı düşünceyi teşvik ederken, öğrencilerin çevresel sorumluluk bilincini geliştirmeyi ve müzik aracılığıyla iklim değişikliği konusundaki farkındalıklarını artırmayı hedeflemektedir. Katılımcılar orman, bitki, böcek, kuş ve iklim değişikliği temalarında şarkı sözü yazar; ortak beste projenin resmi şarkısı olur.',
    completed: false,
  },
  {
    id: 'e8', day: '2', no: 8,
    name: 'Doğanın Fırçası: Bitkilerle Yün İplik Boyama Deneyimi',
    educator: 'Prof. Dr. Selami SELVİ (Balıkesir Üniversitesi)',
    time: '11:30–13:00', venue: 'Kırkağaç Çam Korusu',
    description:
      'Ortaokul 7. sınıf öğrencilerine bitkilerin doğal boyar madde içeriği hakkında farkındalık kazandırmak, bu maddelerin iplik ve kumaş gibi materyallerin renklendirilmesinde kullanılabileceğini göstermek ve doğal boyama yöntemlerinin çevre dostu ve sürdürülebilir bir alternatif olduğunu öğretmektir. Çevre dostu ve sürdürülebilir yöntemlerin iklim değişikliğiyle mücadelede katkı sağlayacağını anlamalarını sağlamaktır.',
    completed: false,
  },
  {
    id: 'e9', day: '2', no: 9,
    name: 'Doğanın Gizemli Canlıları: Likenleri Keşfediyoruz',
    educator: 'Öğr. Üyesi Handan KURTULMUŞ SANCAK (Balıkesir Üniversitesi)',
    time: '14:30–16:00', venue: 'Kırkağaç Çam Korusu',
    description:
      'Ortaokul 7. sınıf öğrencilerine doğada çok bilinmeyen likenler hakkında farkındalık kazandırmak, likenlerin ekosistemdeki katkısını öğretmektir. İklim değişikliği bağlamında biyomonitör olarak da kullanılan bu likenlerin tanınması; mobil uygulamalarla tür teşhisi yapılması. Çevre dostu ve sürdürülebilir yöntemlerin iklim değişikliğiyle mücadelede katkı sağlayacağını anlamalarını sağlamaktır.',
    completed: false,
  },
  {
    id: 'e10', day: '2', no: 10,
    name: 'Doğa Kaşifleri',
    educator: 'Dr. Öğr. Sakin Vural VARLI (Balıkesir Üniversitesi)',
    time: '16:30–18:00', venue: 'Kırkağaç Çam Korusu',
    description:
      'Katılımcıların doğa kaşifleri olarak bitki türlerini keşfetmelerini sağlarken, iklim değişikliğinin bitki türlerinin yaşam alanları üzerindeki etkilerini anlamalarını ve bu konudaki farkındalıklarını artırmayı amaçlamaktadır. Türlerin önemini ve korunma durumlarını öğrenerek, doğa ve çevre bilincini geliştirmeyi; mobil uygulamalarla tür tespiti yapmayı amaçlamaktadır.',
    completed: false,
  },
  {
    id: 'e11', day: '2', no: 11,
    name: 'Gölge',
    educator: 'Hülya DEMİROK BALABAN (Görsel Sanatlar Öğretmeni)',
    time: '18:00–19:30', venue: 'Kırkağaç Çam Korusu',
    description:
      'Katılımcıların doğadan elde edilebilecek doğal renkleri keşfetmelerini, sıcak ve soğuk renklerin doğadaki örneklerini gözlemlemelerini ve bu renkleri sanatsal çalışmalarında kullanmalarını sağlayarak, doğa ve sanat arasındaki bağı anlamalarını amaçlamaktadır. Aynı zamanda, iklim değişikliği ve doğal kaynakların korunmasının önemini vurgulayarak, çevre bilinci ve sürdürülebilirlik konularında farkındalık kazandırmayı amaçlamaktadır.',
    completed: false,
  },

  // ── 3. GÜN · 1 Temmuz · Kozak Yaylası (İzmir) ───────────────────────────────
  {
    id: 'e12', day: '3', no: 12,
    name: 'Doğanın İzleri: Bitki Baskılı Seramik Atölyesi',
    educator: 'Hülya DEMİROK BALABAN (Görsel Sanatlar Öğretmeni)',
    time: '10:00–11:30', venue: 'Kozak Yaylası',
    description:
      'Katılımcıların seramik sanatında bitki baskısı ve boyama tekniklerini öğrenmelerini, doğadan ilham alarak yaratıcılıklarını sergilemelerini ve doğa ile sanat arasındaki bağı keşfetmelerini amaçlamaktadır. Doğadan elde edilen malzemelerin sanatsal çalışmalarda kullanılmasının önemini vurgulayarak, katılımcıların çevresel farkındalıklarını artırmayı hedefler.',
    completed: false,
  },
  {
    id: 'e13', day: '3', no: 13,
    name: "Doğa'dan Felsefe'ye, Felsefe'den Doğa'ya",
    educator: 'Dr. Öğr. Burak ÇAKIR (Anadolu Üniversitesi, Felsefe)',
    time: '11:30–13:00', venue: 'Kozak Yaylası',
    description:
      'Etkinlik, Çocuklar için Felsefe (P4C) yaklaşımına uygun şekilde düzenlenecektir. Bu doğrultuda amaç, çocukların bir topluluk eşliğinde eleştirel, yaratıcı, özen gösterici ve iş birlikli düşünme becerilerini geliştirmektir. İklim değişikliğinin nedenleri, etkileri ve etik boyutları Sokratik sorgulama yöntemiyle tartışılır.',
    completed: false,
  },
  {
    id: 'e14', day: '3', no: 14,
    name: 'İklim İzleme Macerası: Hava Durumu ve İklim Değişikliği Atölyesi',
    educator: 'Prof. Dr. Hakan ÖNAL (Balıkesir Üniversitesi, Coğrafya)',
    time: '14:30–16:00', venue: 'Kozak Yaylası',
    description:
      'Katılımcılara hava durumu verilerini toplama ve analiz etme becerilerini kazandırmayı, farklı dönemlere ait verileri karşılaştırarak iklim değişikliğinin etkilerini gözlemlemelerini sağlamayı ve iklim parametrelerinin uzun vadeli değişikliklerini anlamalarına yardımcı olmayı amaçlamaktadır. Mobil hava istasyonuyla sıcaklık, nem ve rüzgâr hızı ölçülür.',
    completed: false,
  },
  {
    id: 'e15', day: '3', no: 15,
    name: 'Değişen Sadece İklim mi?',
    educator: 'Doç. Dr. Taner ÖZCAN (Balıkesir Üniversitesi, Biyoloji Eğitimi)',
    time: '16:30–18:00', venue: 'Kozak Yaylası',
    description:
      'Katılımcıların farklı yükseltilerde yetişen bitki türlerini gözlemlemelerini, bitki ekolojisi ve habitat farklarını anlamalarını sağlamayı amaçlarken, iklim değişikliğinin bu bitki türleri üzerindeki potansiyel etkilerini fark etmelerini ve bu konuda farkındalık kazanmalarını da amaçlamaktadır. Mobil uygulamalarla tür tespiti ve "Tahmin Et – Gözle – Açıkla" yöntemi kullanılır.',
    completed: false,
  },

  // ── 4. GÜN · 2 Temmuz · Spil Dağı Milli Parkı ───────────────────────────────
  {
    id: 'e16', day: '4', no: 16,
    name: 'Ritmik Doğa',
    educator: 'Mustafa SABUR (Müzik Öğretmeni)',
    time: '10:00–11:30', venue: 'Spil Dağı Milli Parkı',
    description:
      'Katılımcıların doğadan elde edilen materyallerle (taş, dal, kuru yaprak) ritim ve sesler yaratarak, doğanın çeşitliliğini ve her şeyin doğadan geldiğini anlamalarını; doğanın ritimlerini keşfederek doğal kaynakların sanatsal yaratımda nasıl kullanılabileceğini öğrenmelerini ve doğayla olan bağlarını güçlendirmelerini amaçlamaktadır.',
    completed: false,
  },
  {
    id: 'e17', day: '4', no: 17,
    name: 'Kim Dışkı Yiyor?',
    educator: 'Dr. Nicklas JANSSON (Linköping Üniversitesi, İsveç)',
    time: '11:30–13:00', venue: 'Spil Dağı Milli Parkı',
    description:
      'Katılımcıların gübre böceklerinin ekosistem içindeki kritik rolünü ve iklim değişikliği sürecinde oynadıkları hayati önemi anlamalarını; gübre böceklerinin dışkıların ayrışmasında nasıl etkili olduklarını ve bu süreçlerin toprak sağlığı üzerindeki olumlu etkilerini keşfetmelerini; ve iklim değişikliğinin bu türlerin popülasyonları üzerindeki olası etkilerini gözlemleyerek çevresel farkındalıklarını artırmalarını amaçlamaktadır.',
    completed: false,
  },
  {
    id: 'e18', day: '4', no: 18,
    name: 'Tozlayıcılar Kimlerdir?',
    educator: 'Dr. Nicklas JANSSON (Linköping Üniversitesi, İsveç)',
    time: '14:30–16:00', venue: 'Spil Dağı Milli Parkı',
    description:
      'Katılımcıların tozlayıcı böceklerin ekosistemler ve gıda üretimi için kritik önemini anlamalarını sağlarken, iklim değişikliğinin bu böceklerin popülasyonları ve işlevleri üzerindeki etkilerini gözlemlemelerine ve farkındalık kazanmalarına; tozlayıcı böceklerin çeşitliliğini keşfederek, doğal dengeyi korumanın gerekliliğini ve doğanın hassas dengesine olan katkılarını öğrenmelerine yardımcı olmayı amaçlamaktadır.',
    completed: false,
  },
  {
    id: 'e19', day: '4', no: 19,
    name: 'Habitatlar ve Biyolojik Çeşitlilik',
    educator: 'Dr. Nicklas JANSSON (Linköping Üniversitesi, İsveç)',
    time: '16:30–18:00', venue: 'Spil Dağı Milli Parkı',
    description:
      'Katılımcıların farklı yaşam alanlarındaki biyolojik çeşitliliği gözlemlemelerini, biyoçeşitliliğin ekosistem sağlığı için önemini anlamalarını ve iklim değişikliğinin bu çeşitlilik üzerindeki potansiyel etkilerini keşfederek çevresel farkındalıklarını artırmalarını amaçlamaktadır.',
    completed: false,
  },

  // ── 5. GÜN · 3 Temmuz · Spil Dağı Milli Parkı + Soma BİLSEM ─────────────────
  {
    id: 'e20', day: '5', no: 20,
    name: 'Kuş Evi',
    educator: 'Hülya DEMİROK BALABAN (Görsel Sanatlar Öğretmeni)',
    time: '10:00–11:30', venue: 'Spil Dağı Milli Parkı',
    description:
      'Katılımcıların kuş evlerinin doğadaki kuşlar için önemini ve ekosistem içindeki rollerini anlamalarını; kuş evlerini tasarlayıp yaparak doğaya katkıda bulunmalarını; doğa sevgisini geliştirmelerini; ve çevresel sorumluluk bilinci kazanmalarını amaçlamaktadır. Yapılan kuş evleri Spil Dağı Milli Parkı\'ndaki uygun alanlara yerleştirilir.',
    completed: false,
  },
  {
    id: 'e21', day: '5', no: 21,
    name: 'Kuş Dünyası ve İklim Araştırması: Kuşların Beslenme Tercihi',
    educator: 'Dr. Öğr. Ayşegül KARAAHMETOĞLU ÇOBAN',
    time: '11:30–13:00', venue: 'Spil Dağı Milli Parkı',
    description:
      'Katılımcıların farklı kuş türlerinin beslenme alışkanlıklarını ve ekosistem içindeki rollerini anlamalarını; iklim değişikliğinin kuşların besin kaynakları üzerindeki potansiyel etkilerini keşfetmelerini; ve bu süreçte çevresel farkındalık ve doğa koruma bilinci kazanmalarını amaçlamaktadır. Dürbünlerle kuş gözlemi ve tür tespiti yapılır.',
    completed: false,
  },
  {
    id: 'e22', day: '5', no: 22,
    name: 'Kuşlar için Habitat Gereksinimleri: Nerede ve Neden?',
    educator: 'Dr. Öğr. Ayşegül KARAAHMETOĞLU ÇOBAN',
    time: '14:30–16:00', venue: 'Spil Dağı Milli Parkı',
    description:
      'Katılımcıların farklı kuş türlerinin habitat gereksinimlerini (yuvalama alanı, besin, su) anlamalarını; iklim değişikliğinin kuşların yaşam alanları ve göç yolları üzerindeki potansiyel etkilerini keşfetmelerini; ve bu değişikliklerin ekosistem dinamiklerine nasıl yansıdığını değerlendirerek çevresel farkındalık kazanmalarını amaçlamaktadır.',
    completed: false,
  },
  {
    id: 'e23', day: '5', no: 23,
    name: 'Kuşları Tanıyorum',
    educator: 'Dr. Öğr. Ayşegül KARAAHMETOĞLU ÇOBAN',
    time: '16:30–18:00', venue: 'Spil Dağı Milli Parkı',
    description:
      'Katılımcıların kuşların ekosistemler üzerindeki katkılarını ve besin ağlarındaki rollerini anlamalarını; kuşları doğru bir şekilde tanımlama becerilerini geliştirmelerini; iklim değişikliğinin kuşların göç yolları ve yaşam alanları üzerindeki etkilerini keşfetmelerini; ve bu değişikliklerin ekosistem dinamiklerine nasıl yansıdığını değerlendirerek çevresel farkındalık ve doğa koruma bilinci kazanmalarını amaçlamaktadır.',
    completed: false,
  },
  {
    id: 'e24', day: '5', no: 24,
    name: 'Kapanış Töreni ve Sertifika Takdimi',
    educator: 'Kerim Burak BEYGE (Proje Yürütücüsü)',
    time: '19:30–20:30', venue: 'Soma Bilim ve Sanat Merkezi',
    description:
      'Katılımcıların 5 günlük doğa kampı süresince edindikleri bilgi, beceri ve deneyimleri kutlamalarını; doğa ile kurdukları bağı pekiştirmelerini; ve kamp süresince gösterdikleri çaba ve başarıları takdir ederek sertifikalarını sunarak motivasyonlarını artırmayı amaçlamaktadır. Kamp fotoğrafları ve grup çalışmaları sergilenir.',
    completed: false,
  },
  {
    id: 'e25', day: '5', no: 25,
    name: 'Son Test Uygulaması ve Konaklamadan Ayrılış',
    educator: 'Kerim Burak BEYGE (Proje Yürütücüsü)',
    time: '20:30–21:30', venue: 'Soma Bilim ve Sanat Merkezi',
    description:
      'Katılımcıların 5 günlük doğa kampı süresince edindikleri bilgi ve farkındalık düzeyini ölçmek amacıyla "İklim Değişikliği Farkındalığı" ölçeğinin son test olarak uygulanması. Ölçek tamamlandıktan sonra katılımcılar ve refakatçi rehberler ayrılış işlemlerini gerçekleştirir.',
    completed: false,
  },
];

// ── EventCard Bileşeni ────────────────────────────────────────────────────────

function EventCard({ event, canComplete, onComplete, completedIds }) {
  const [expanded, setExpanded] = useState(false);
  const isCompleted = completedIds.has(event.id);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(prev => !prev);
  };

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={toggle}
      style={[styles.card, isCompleted && styles.cardDone]}
    >
      {/* ── Kart başlığı ── */}
      <View style={styles.cardHeader}>
        <View style={[styles.noBadge, isCompleted && styles.noBadgeDone]}>
          <Text style={styles.noBadgeText}>{event.no}</Text>
        </View>
        <View style={styles.cardMeta}>
          <Text style={[styles.cardTitle, isCompleted && styles.cardTitleDone]} numberOfLines={expanded ? 0 : 2}>
            {event.name}
          </Text>
          <Text style={styles.cardEducator} numberOfLines={expanded ? 0 : 1}>
            <Ionicons name="person-circle-outline" size={12} color={COLORS.textMuted} />
            {'  '}{event.educator}
          </Text>
          <View style={styles.infoChipRow}>
            <View style={styles.infoChip}>
              <Ionicons name="time-outline" size={12} color={COLORS.primaryMid} />
              <Text style={styles.infoChipText}>{event.time}</Text>
            </View>
            <View style={styles.infoChip}>
              <Ionicons name="location-outline" size={12} color={COLORS.primaryMid} />
              <Text style={styles.infoChipText} numberOfLines={1}>{event.venue}</Text>
            </View>
          </View>
        </View>
        <View style={styles.chevronWrap}>
          {isCompleted
            ? <Ionicons name="checkmark-circle" size={22} color={COLORS.primaryLight} />
            : <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={COLORS.textMuted} />
          }
        </View>
      </View>

      {/* ── Genişletilmiş açıklama ── */}
      {expanded && (
        <View style={styles.expandedBody}>
          <View style={styles.divider} />
          <Text style={styles.description}>{event.description}</Text>
          {canComplete && !isCompleted && (
            <TouchableOpacity
              style={styles.completeBtn}
              onPress={() => onComplete(event)}
              activeOpacity={0.8}
            >
              <Ionicons name="checkmark-done-outline" size={16} color={COLORS.white} />
              <Text style={styles.completeBtnText}>Etkinliği Tamamla</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

// ── EventsScreen Ana Bileşeni ─────────────────────────────────────────────────

export default function EventsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const [selectedDay, setSelectedDay] = useState('1');
  const [completedIds, setCompletedIds] = useState(new Set());

  const canComplete = [ROLES.ADMIN, ROLES.TRAINER, ROLES.GUIDE].includes(profile?.role);
  const dayEvents   = EVENTS.filter(e => e.day === selectedDay);
  const completedCount = dayEvents.filter(e => completedIds.has(e.id)).length;

  const completeEvent = async (event) => {
    const formRef = await addDoc(collection(db, 'evaluationForms'), {
      eventId: event.id,
      eventName: event.name,
      completedAt: serverTimestamp(),
      answers: {},
      pending: true,
    });

    setCompletedIds(prev => new Set([...prev, event.id]));

    const currentIdx = EVENTS.findIndex(e => e.id === event.id);
    const next = EVENTS[currentIdx + 1];
    if (next) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '✅ Sıradaki Etkinlik',
          body: `"${event.name}" tamamlandı. Sıradaki: ${next.name}`,
        },
        trigger: null,
      });
    }

    navigation.navigate('EvaluationForm', { formId: formRef.id, eventName: event.name });
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>

      {/* ── Başlık ── */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.screenTitle}>Etkinlik Programı</Text>
          <Text style={styles.screenSub}>Doğanın Sesi · 29 Haz – 3 Tem 2026</Text>
        </View>
        <View style={styles.progressPill}>
          <Ionicons name="leaf" size={13} color={COLORS.primaryMid} />
          <Text style={styles.progressText}>
            {Array.from(completedIds).length}/{EVENTS.length}
          </Text>
        </View>
      </View>

      {/* ── Gün Sekmeleri ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.dayTabsContainer}
        style={styles.dayTabsScroll}
      >
        {DAYS.map(day => {
          const active  = day.key === selectedDay;
          const dayDone = EVENTS.filter(e => e.day === day.key).every(e => completedIds.has(e.id));
          return (
            <TouchableOpacity
              key={day.key}
              onPress={() => setSelectedDay(day.key)}
              style={[styles.dayTab, active && styles.dayTabActive]}
              activeOpacity={0.8}
            >
              {dayDone && (
                <Ionicons
                  name="checkmark-circle"
                  size={12}
                  color={active ? COLORS.white : COLORS.primaryLight}
                  style={{ marginBottom: 1 }}
                />
              )}
              <Text style={[styles.dayTabLabel, active && styles.dayTabLabelActive]}>
                {day.label}
              </Text>
              <Text style={[styles.dayTabDate, active && styles.dayTabDateActive]}>
                {day.date}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── Gün özet ── */}
      <View style={styles.daySummaryRow}>
        <Text style={styles.daySummaryText}>
          {dayEvents.length} etkinlik
          {completedCount > 0 ? ` · ${completedCount} tamamlandı` : ''}
        </Text>
      </View>

      {/* ── Etkinlik Listesi ── */}
      <ScrollView
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        {dayEvents.map(event => (
          <EventCard
            key={event.id}
            event={event}
            canComplete={canComplete}
            onComplete={completeEvent}
            completedIds={completedIds}
          />
        ))}
      </ScrollView>
    </View>
  );
}

// ── Stiller ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },

  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: -0.5,
  },
  screenSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  progressPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primaryPale,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
  },
  progressText: { fontSize: 12, fontWeight: '700', color: COLORS.primaryMid },

  // Gün sekmeleri
  dayTabsScroll: { maxHeight: 72 },
  dayTabsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  dayTab: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.card,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    minWidth: 72,
  },
  dayTabActive: {
    backgroundColor: COLORS.primaryMid,
    borderColor: COLORS.primaryMid,
    ...SHADOWS.button,
  },
  dayTabLabel: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary },
  dayTabLabelActive: { color: COLORS.white },
  dayTabDate: { fontSize: 10, color: COLORS.textMuted, marginTop: 1 },
  dayTabDateActive: { color: 'rgba(255,255,255,0.75)' },

  daySummaryRow: { paddingHorizontal: 20, paddingBottom: 6 },
  daySummaryText: { fontSize: 12, color: COLORS.textMuted, fontWeight: '500' },

  listContent: { paddingHorizontal: 16, paddingBottom: 120, gap: 10 },

  // Kart
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.card,
  },
  cardDone: { opacity: 0.65, backgroundColor: COLORS.cardAlt },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  noBadge: {
    width: 34, height: 34,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.primaryMid,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
    flexShrink: 0,
  },
  noBadgeDone: { backgroundColor: COLORS.primaryXLight },
  noBadgeText: { color: COLORS.white, fontWeight: '800', fontSize: 14 },
  cardMeta: { flex: 1, gap: 3 },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
    lineHeight: 19,
  },
  cardTitleDone: { textDecorationLine: 'line-through', color: COLORS.textMuted },
  cardEducator: { fontSize: 11, color: COLORS.textSecondary, marginTop: 1 },
  infoChipRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 5,
    flexWrap: 'wrap',
  },
  infoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: COLORS.primaryPale,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
  },
  infoChipText: { fontSize: 10, color: COLORS.primaryMid, fontWeight: '600' },
  chevronWrap: { paddingTop: 4, flexShrink: 0 },

  expandedBody: { marginTop: 8 },
  divider: { height: 1, backgroundColor: COLORS.borderLight, marginBottom: 10 },
  description: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 20 },
  completeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
    backgroundColor: COLORS.primaryMid,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    ...SHADOWS.button,
  },
  completeBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 13 },
});
