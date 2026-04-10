/**
 * Doğanın Sesi - Kullanıcı Oluşturma Scripti
 *
 * Kullanım:
 *   node scripts/createUsers.js
 *
 * Yeni kullanıcı eklemek için aşağıdaki USERS dizisine satır ekleyin:
 *   { name: 'Ad Soyad', phone: '5XXXXXXXXX', role: 'student' }
 *
 * Roller: admin | trainer | guide | volunteer | student | parent
 */

const FIREBASE_API_KEY = 'AIzaSyAk3cECG_iQzGIjoeuzyVaCEt6qDVtSpTQ';
const FIREBASE_PROJECT_ID = 'doganin-sesi-app';

// ─── KULLANICI LİSTESİ ───────────────────────────────────────────────────────
// Yeni katılımcı geldiğinde buraya ekleyin, scripti tekrar çalıştırın.
const USERS = [
  { name: 'Kerim Burak Beyge', phone: '5544660476', role: 'admin' },

  // Örnek — gerçek liste gelince doldurun:
  // { name: 'Ayşe Yılmaz',     phone: '5XXXXXXXXX', role: 'trainer'   },
  // { name: 'Mehmet Demir',    phone: '5XXXXXXXXX', role: 'student'   },
  // { name: 'Fatma Kaya',      phone: '5XXXXXXXXX', role: 'parent'    },
  // { name: 'Ali Çelik',       phone: '5XXXXXXXXX', role: 'guide'     },
  // { name: 'Zeynep Şahin',    phone: '5XXXXXXXXX', role: 'volunteer' },
];
// ─────────────────────────────────────────────────────────────────────────────

function nameToEmail(fullName) {
  return fullName
    .toLowerCase()
    .replace(/ç/g, 'c').replace(/ş/g, 's').replace(/ğ/g, 'g')
    .replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/ı/g, 'i')
    .replace(/â/g, 'a').replace(/î/g, 'i').replace(/û/g, 'u')
    .replace(/\s+/g, '') + '@doganin-sesi.app';
}

async function createUser({ name, phone, role }) {
  const email = nameToEmail(name);
  const password = phone;

  // 1. Firebase Auth'da kullanıcı oluştur
  const signUpRes = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, displayName: name, returnSecureToken: true }),
    }
  );
  const signUpData = await signUpRes.json();

  if (signUpData.error) {
    if (signUpData.error.message === 'EMAIL_EXISTS') {
      console.log(`⚠️  Zaten mevcut: ${name} (${email})`);
      return;
    }
    throw new Error(`${name} → Auth hatası: ${signUpData.error.message}`);
  }

  const uid = signUpData.localId;
  const idToken = signUpData.idToken;

  // 2. Firestore'da profil oluştur
  const firestoreRes = await fetch(
    `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/users/${uid}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        fields: {
          displayName: { stringValue: name },
          email:       { stringValue: email },
          role:        { stringValue: role },
          phone:       { stringValue: phone },
          points:      { integerValue: 0 },
          badges:      { arrayValue: { values: [] } },
          createdAt:   { timestampValue: new Date().toISOString() },
        },
      }),
    }
  );

  if (!firestoreRes.ok) {
    const err = await firestoreRes.json();
    throw new Error(`${name} → Firestore hatası: ${JSON.stringify(err.error?.message)}`);
  }

  console.log(`✅ Oluşturuldu: ${name} | ${email} | Rol: ${role}`);
}

async function main() {
  console.log(`\n🌿 Doğanın Sesi — Kullanıcı Oluşturma\n${'─'.repeat(50)}`);
  for (const user of USERS) {
    try {
      await createUser(user);
    } catch (e) {
      console.error(`❌ Hata: ${e.message}`);
    }
  }
  console.log(`${'─'.repeat(50)}\nTamamlandı.\n`);
}

main();
