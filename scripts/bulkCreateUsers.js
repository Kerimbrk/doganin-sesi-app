#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Doğanın Sesi — Toplu Kullanıcı Oluşturma Scripti
// Çalıştırma: node scripts/bulkCreateUsers.js
// Gereksinim: Node.js 18+ (ek npm paketi gerekmez)
// ─────────────────────────────────────────────────────────────────────────────

const https = require('https');

const API_KEY    = 'AIzaSyAk3cECG_iQzGIjoeuzyVaCEt6qDVtSpTQ';
const PROJECT_ID = 'doganin-sesi-app';

// ── Kullanıcı listesi ─────────────────────────────────────────────────────────
// Roller: trainer (Eğitmen/Uzman) | guide (Rehber) | volunteer (Gönüllü)
const USERS = [
  { name: 'Taner Özcan',                 phone: '5376731556', role: 'trainer'   },
  { name: 'Dilek Türker',                phone: '5303640740', role: 'trainer'   },
  { name: 'Selami Selvi',                phone: '5302212679', role: 'trainer'   },
  { name: 'Hakan Önal',                  phone: '5425832006', role: 'trainer'   },
  { name: 'Sakin Vural Varlı',           phone: '5335699698', role: 'trainer'   },
  { name: 'Nicklas Jansson',             phone: '705534944',  role: 'trainer'   }, // 9 haneli İsveç numarası
  { name: 'Burak Çakır',                 phone: '5525195620', role: 'trainer'   },
  { name: 'Ayşegül Çoban Karaahmetoğlu', phone: '5325152056', role: 'trainer'   },
  { name: 'Handan Kurtulmuş Sancak',     phone: '5364362344', role: 'trainer'   },
  { name: 'Mustafa Sabur',               phone: '5074873907', role: 'trainer'   },
  { name: 'Hülya Demirok Balaban',       phone: '5050309089', role: 'trainer'   },
  { name: 'Ayşe Altun',                  phone: '5057904036', role: 'guide'     },
  { name: 'Derya Deniz Karameşe',        phone: '5058240820', role: 'guide'     },
  { name: 'Nazire Taşkın',               phone: '5067151473', role: 'guide'     },
  { name: 'Ertan Öz',                    phone: '5546130904', role: 'guide'     },
  { name: 'Şeyma Gülizar Yeşil',         phone: '5054789481', role: 'guide'     },
  { name: 'Bayram Gülcan',               phone: '5536020314', role: 'guide'     },
  { name: 'Faysal Sayan',                phone: '5557316730', role: 'guide'     },
  { name: 'Fadime Gül Ötken',            phone: '5531667451', role: 'guide'     },
  { name: 'Enise Ulu Çoğalan',           phone: '5374214086', role: 'guide'     },
  { name: 'İbrahim Benli',               phone: '5397988107', role: 'volunteer' },
  { name: 'Arda Kıvrak',                 phone: '5378574493', role: 'volunteer' },
  { name: 'Elif Baysal',                 phone: '5330282161', role: 'volunteer' },
];

// ── Yardımcı fonksiyonlar ─────────────────────────────────────────────────────

function nameToEmail(fullName) {
  return fullName
    .toLowerCase()
    .replace(/ç/g, 'c').replace(/ş/g, 's').replace(/ğ/g, 'g')
    .replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/ı/g, 'i')
    .replace(/â/g, 'a').replace(/î/g, 'i').replace(/û/g, 'u')
    .replace(/\s+/g, '')
    + '@doganin-sesi.app';
}

function request(method, url, body, token = null) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const u    = new URL(url);
    const opts = {
      hostname: u.hostname,
      path:     u.pathname + u.search,
      method,
      headers: {
        'Content-Type':   'application/json',
        'Content-Length': Buffer.byteLength(data),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    };
    const req = https.request(opts, (res) => {
      let raw = '';
      res.on('data', (c) => (raw += c));
      res.on('end', () => {
        try { resolve(JSON.parse(raw)); }
        catch { reject(new Error(raw)); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// ── Tek kullanıcı oluştur ─────────────────────────────────────────────────────

async function createUser({ name, phone, role }) {
  const email = nameToEmail(name);

  // 1. Firebase Authentication: hesap oluştur
  const authRes = await request(
    'POST',
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`,
    { email, password: phone, returnSecureToken: true }
  );

  if (authRes.error) {
    if (authRes.error.message === 'EMAIL_EXISTS') {
      console.log(`⚠️  Zaten mevcut: ${name}`);
      return;
    }
    throw new Error(authRes.error.message);
  }

  const { localId: uid, idToken } = authRes;

  // 2. Firestore: kullanıcı belgesi oluştur
  const now   = new Date().toISOString();
  const fsRes = await request(
    'PATCH',
    `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/users/${uid}`,
    {
      fields: {
        displayName:     { stringValue: name },
        email:           { stringValue: email },
        role:            { stringValue: role },
        points:          { integerValue: '0' },
        badges:          { arrayValue: { values: [] } },
        passwordChanged: { booleanValue: false },
        createdAt:       { timestampValue: now },
      },
    },
    idToken
  );

  if (fsRes.error) throw new Error(JSON.stringify(fsRes.error));

  const roleLabel = role === 'trainer' ? 'Eğitmen' : role === 'guide' ? 'Rehber' : 'Gönüllü';
  console.log(`✅ ${name.padEnd(32)} ${roleLabel.padEnd(10)} ${email}`);
}

// ── Ana akış ──────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🌿 Doğanın Sesi — Toplu Kullanıcı Oluşturma');
  console.log('─'.repeat(70));

  let ok = 0, skip = 0, fail = 0;

  for (const u of USERS) {
    try {
      await createUser(u);
      ok++;
    } catch (e) {
      console.log(`❌ HATA — ${u.name}: ${e.message}`);
      fail++;
    }
    // Firebase rate-limit aşmamak için kısa bekleme
    await new Promise(r => setTimeout(r, 300));
  }

  console.log('─'.repeat(70));
  console.log(`\nSonuç: ${ok} oluşturuldu | ${skip} zaten vardı | ${fail} hata\n`);
  console.log('İlk şifre = telefon numarası');
  console.log('Kullanıcılar ilk girişte şifre değiştirme ekranıyla karşılaşacak.\n');
}

main().catch(console.error);
