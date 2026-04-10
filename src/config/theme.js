// 4004 Doğanın Sesi — Orman Yeşili Tema

export const COLORS = {
  // Yeşil skalası
  primary:      '#1B4332',  // koyu orman
  primaryMid:   '#2D6A4F',  // ana yeşil
  primaryLight: '#52B788',  // açık yeşil
  primaryXLight:'#95D5B2',  // soluk yeşil
  primaryPale:  '#D8F3DC',  // çok açık yeşil / arka plan aksan

  // Toprak aksan
  accent:       '#92400E',  // kahverengi-altın
  accentLight:  '#D97706',

  // Arka planlar
  background:   '#F7FAF7',  // krem beyaz
  card:         '#FFFFFF',
  cardAlt:      '#F0F7F0',

  // Sınır / ayraç
  border:       '#D1E8D1',
  borderLight:  '#EAF4EA',

  // Metin
  textPrimary:  '#1A2E1A',
  textSecondary:'#4B5E4B',
  textMuted:    '#8FA38F',

  // Etkileşim
  like:         '#E53E3E',
  likeInactive: '#C4CFC4',

  // Tab bar
  tabActive:    '#2D6A4F',
  tabInactive:  '#A0AEA0',
  tabBg:        '#FFFFFF',

  // Rol renkleri
  roles: {
    admin:     '#92400E',
    trainer:   '#1B4332',
    guide:     '#065F46',
    volunteer: '#4338CA',
    student:   '#1D4ED8',
    parent:    '#6B7280',
  },

  white: '#FFFFFF',
  black: '#000000',
};

export const ROLE_LABELS = {
  admin:     'Admin',
  trainer:   'Eğitimci',
  guide:     'Rehber',
  volunteer: 'Gönüllü',
  student:   'Öğrenci',
  parent:    'Veli',
};

export const SHADOWS = {
  card: {
    shadowColor: '#1B4332',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  tabBar: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 14,
  },
  button: {
    shadowColor: '#2D6A4F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
};

export const RADIUS = {
  sm:   8,
  md:   12,
  lg:   16,
  xl:   24,
  full: 999,
};
