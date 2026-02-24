# FISLAB-II — Portal Manajemen Laboratorium Fisika Dasar 2

![HTML](https://img.shields.io/badge/HTML-E34F26?logo=html5&logoColor=white)
![CSS](https://img.shields.io/badge/CSS-1572B6?logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=black)
![Firebase](https://img.shields.io/badge/Firebase-FFCA28?logo=firebase&logoColor=black)

**Portal web untuk manajemen praktikum dan administrasi Laboratorium Fisika Dasar 2.** Aplikasi ini memfasilitasi praktikan dan asisten laboratorium dalam pengelolaan modul, penilaian, dan penjadwalan praktikum secara digital.

---

## 📋 Daftar Isi

- [Gambaran Umum](#-gambaran-umum)
- [Arsitektur Sistem](#-arsitektur-sistem)
- [Struktur Database](#-struktur-database)
- [Fitur & Komponen](#-fitur--komponen)
- [Teknologi](#-teknologi)
- [Struktur Folder](#-struktur-folder)
- [Instalasi & Setup](#-instalasi--setup)
- [Konfigurasi](#-konfigurasi)
- [Deployment](#-deployment)
- [Keamanan](#-keamanan)
- [Pengembangan](#-pengembangan)

---

## 🎯 Gambaran Umum

FISLAB-II adalah aplikasi web single-page yang dirancang untuk mengelola kegiatan praktikum laboratorium fisika. Sistem ini mendukung tiga peran pengguna utama dengan hak akses berbeda:

### Peran Pengguna

1. **Praktikan (Mahasiswa)**
   - Melihat jadwal praktikum
   - Mengakses modul praktikum
   - Melihat nilai praktikum
   - Mengelola profil pribadi
   - Menghubungi asisten laboratorium

2. **Asisten Laboratorium**
   - Semua fitur praktikan
   - Melakukan penilaian praktikum
   - Mengelola jadwal praktikum kelompok
   - Melihat daftar praktikan

3. **Admin (Asisten dengan hak khusus)**
   - Semua fitur asisten
   - Dashboard administrasi lengkap
   - Manajemen pengguna
   - Ekspor data nilai
   - Akses statistik dan analitik

---

## 🏗️ Arsitektur Sistem

### Arsitektur Client-Side

Aplikasi ini menggunakan arsitektur **Multi-Page Application (MPA)** dengan pendekatan modular:

```
┌─────────────────────────────────────────────┐
│           Client Browser                     │
├─────────────────────────────────────────────┤
│  HTML Pages (index, home, admin, dll.)      │
│  ├─ Page-specific JS modules                │
│  ├─ Shared sidebar.js (navigation & auth)   │
│  └─ Shared style.css (global styles)        │
├─────────────────────────────────────────────┤
│  External Libraries                          │
│  ├─ Firebase SDK (Auth & Realtime DB)       │
│  ├─ Chart.js (Data visualization)           │
│  ├─ MathJax (LaTeX math rendering)          │
│  └─ Supabase SDK (Optional integration)     │
└─────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────┐
│     Firebase Realtime Database              │
│  ├─ /users/{nrp}                            │
│  ├─ /kelompok/{kelompokId}                  │
│  ├─ /judulPraktikum/{modulId}               │
│  └─ /modul/{modulId}                        │
└─────────────────────────────────────────────┘
```

### Flow Autentikasi

```
1. User → index.html (Login Page)
2. Submit NRP + Password
3. Firebase Realtime DB → Validate credentials
4. Store session (localStorage: fislab-nrp, fislab-role)
5. Redirect → home.html
6. sidebar.js → Auth guard on every page
```

### Pola Desain

- **Auth Guard**: Setiap halaman dilindungi oleh `sidebar.js` yang memeriksa `localStorage.getItem('fislab-nrp')`
- **Role-Based Rendering**: Menu sidebar disesuaikan berdasarkan `fislab-role` dan `fislab-admin`
- **Shared UI Components**: `sidebar.js` menyediakan navigasi, dark mode, dan logout
- **Real-time Data Sync**: Firebase Realtime Database dengan listener `.on('value', ...)`

---

## 🗄️ Struktur Database

### Firebase Realtime Database Schema

Database menggunakan struktur hierarki JSON dengan node utama:

#### 1. `/users/{nrp}`
Menyimpan data pengguna (praktikan dan asisten).

```json
{
  "nrp": "5026221234",
  "nama": "John Doe",
  "email": "john@student.its.ac.id",
  "password": "hashed_password",
  "role": "Praktikan",
  "kelompokId": "kelompok 1",
  "telepon": "081234567890",
  "fotoUrl": "https://...",
  "admin": false,
  "judul": ["MP1", "MP2"],
  "nilai": {
    "MP1": {
      "pre-lab": 90,
      "in-lab": 85,
      "abstrak": 80,
      "pendahuluan": 88,
      "metodologi": 82,
      "analisis data dan perhitungan": 90,
      "pembahasan": 85,
      "kesimpulan": 88,
      "format": 90,
      "plagiasi, dan tidak bisa mengurai AI": 10,
      "catatan": "Baik",
      "_updatedAt": 1640000000000
    }
  }
}
```

**Field Khusus Asisten:**
- `admin`: Boolean, menandakan hak akses admin
- `judul`: Array modul yang diampu (contoh: `["MP1", "W3"]`)

#### 2. `/kelompok/{kelompokId}`
Menyimpan data kelompok dan jadwal praktikum.

```json
{
  "kelompok 1": {
    "namaKelompok": "Kelompok 1",
    "MP1": {
      "week": 1,
      "tanggal": "2024-03-15",
      "jam-awal": "07:00",
      "jam-akhir": "09:00",
      "aslab": ["5026220001"]
    },
    "W1": {
      "week": 2,
      "tanggal": "2024-03-22",
      "jam-awal": "09:00",
      "jam-akhir": "11:00",
      "aslab": ["5026220002", "5026220003"]
    }
  }
}
```

#### 3. `/judulPraktikum/{modulId}`
Menyimpan informasi modul praktikum.

```json
{
  "MP1": {
    "namaJudul": "Konstanta Planck",
    "kategori": "Modern Physics"
  },
  "W1": {
    "namaJudul": "Difraksi",
    "kategori": "Gelombang"
  }
}
```

#### 4. `/modul/{modulId}` (Optional)
Metadata tambahan untuk modul (deskripsi, konten tambahan).

### Aspek Penilaian

Sistem penilaian menggunakan **9 aspek dengan bobot berbeda**:

| Aspek | Key | Bobot |
|-------|-----|-------|
| Pre-lab | `pre-lab` | 10% |
| In-lab | `in-lab` | 10% |
| Abstrak | `abstrak` | 5% |
| Pendahuluan | `pendahuluan` | 10% |
| Metodologi | `metodologi` | 5% |
| Analisis Data & Perhitungan | `analisis data dan perhitungan` | 20% |
| Pembahasan | `pembahasan` | 25% |
| Kesimpulan | `kesimpulan` | 10% |
| Format | `format` | 5% |

**Rumus Nilai Akhir:**
```javascript
totalAspek = Σ(nilai_aspek × bobot_aspek / 100)
penalti_plagiasi = plagiasi_persen / 100
nilai_akhir = totalAspek × (1 - penalti_plagiasi)
```

---

## 🎨 Fitur & Komponen

### 1. Sistem Autentikasi (`index.html`, `index.js`)

**Fitur:**
- Login dengan NRP dan password
- Validasi kredensial dari Firebase Realtime Database
- Loading screen animasi dengan progress bar
- Avatar animation frame-by-frame
- Session management dengan localStorage
- Password visibility toggle

**Komponen Teknis:**
```javascript
// Auth validation
database.ref('users/' + nrp).once('value').then(snapshot => {
  const userData = snapshot.val();
  if (userData && userData.password === inputPassword) {
    localStorage.setItem('fislab-nrp', nrp);
    localStorage.setItem('fislab-role', userData.role);
    // Redirect to home
  }
});
```

### 2. Dashboard (`home.html`, `home.js`)

**Fitur Praktikan:**
- Ringkasan nilai dengan Chart.js (bar chart)
- Statistik praktikum (rata-rata, modul terbaik/terburuk)
- Quick access ke modul dan jadwal

**Fitur Asisten:**
- Grafik penilaian kelompok
- Daftar kelompok yang diampu
- Akses cepat ke penjadwalan dan penilaian

**Visualisasi Data:**
- Chart.js responsive dengan tema dark mode
- Color scheme mengikuti CSS variables (`--primary-gold`)
- Tooltip interaktif untuk detail nilai

### 3. Profile Management (`profile.html`, `profile.js`)

**Fitur:**
- View dan edit profil (nama, email, telepon)
- Upload foto profil (Base64)
- Ubah password dengan validasi password lama
- Avatar fallback dengan UI-Avatars API
- Real-time update ke Firebase

**Flow Upload Foto:**
```javascript
1. User pilih file → FileReader API
2. Convert ke Base64
3. Update users/{nrp}/fotoUrl
4. Tampilkan preview langsung
```

### 4. Modul Praktikum (`modul.html`, `view-modul.html`)

**Fitur:**
- Grid view 10 modul (MP1-MP5, W1-W5)
- Konversi LaTeX → HTML (Pandoc)
- MathJax untuk render persamaan matematika
- Table of Contents (TOC) auto-generated
- Navigasi prev/next antar modul
- WhatsApp contact modal untuk asisten modul
- Responsive layout dengan dark mode

**Konversi LaTeX (`scripts/convert-tex.js`):**
```bash
# Pandoc command
pandoc -f latex -t html --mathjax \
  -o public/modul-html/MP1.html \
  modul/MP/Konstanta_Planck.tex
```

**Mapping Modul:**
- MP1: Konstanta Planck
- MP2: Milikan
- MP3: Hysteresis Magnet
- MP4: Radioaktivitas
- MP5: Franck Hertz
- W1: Difraksi
- W2: Polarisasi
- W3: Spektroskopi
- W4: Gelombang Mekanik
- W5: Cincin Newton
- Data: Pengolahan Data

### 5. Penilaian (`penilaian.html`, `penilaian.js`)

**Hanya untuk Asisten Laboratorium**

**Fitur:**
- Form penilaian dengan 9 aspek + plagiasi
- Auto-populate kelompok berdasarkan modul asisten
- Filter praktikan per kelompok
- Preview avatar praktikan
- Input validation (0-100)
- Real-time calculation nilai akhir
- Timestamp automatic (`_updatedAt`)

**Workflow:**
```
1. Pilih Kelompok → Load praktikan
2. Pilih Praktikan → Load nilai existing (jika ada)
3. Input/Edit nilai aspek
4. Submit → Update users/{nrp}/nilai/{modulId}
```

### 6. Nilai Praktikum (`nilai.html`, `nilai.js`)

**Untuk Praktikan**

**Fitur:**
- Tabel nilai semua modul (MP1-MP5, W1-W5)
- Status badge (Belum Dinilai, Sedang Dinilai, Sudah Dinilai)
- Modal detail nilai (breakdown per aspek)
- Timestamp last update
- Catatan dari asisten

**Logic Status:**
```javascript
if (filledCount === 0) → "Belum Dinilai"
else if (filledCount < total_aspek) → "Sedang Dinilai"
else → "Sudah Dinilai"
```

### 7. Jadwal Praktikum (`jadwal.html`, `jadwal.js`)

**Untuk Semua User**

**Fitur:**
- View mode: List & Calendar
- Informasi jadwal per kelompok
- Display: Modul, Minggu, Tanggal, Jam, Asisten
- Filter kelompok (untuk asisten)
- Calendar view dengan highlight tanggal praktikum

**Sesi Waktu:**
- Sesi 1: 07:00 - 09:00
- Sesi 2: 09:00 - 11:00
- Sesi 3: 11:00 - 13:00
- Sesi 4: 13:30 - 15:30
- Sesi 5: 15:30 - 17:30
- Sesi 6: 18:00 - 20:00

### 8. Penjadwalan (`penjadwal.html`, `penjadwal.js`)

**Hanya untuk Asisten Laboratorium**

**Fitur:**
- Card view per modul yang diampu
- Input tanggal praktikum
- Pilih sesi waktu (dropdown 6 sesi)
- Validasi konflik jadwal:
  - Maksimal 3 kelompok per sesi
  - Modul yang sama tidak boleh bentrok
- Real-time availability indicator
- Toast notification sukses/gagal
- Cancel jadwal

**Validasi Logic:**
```javascript
// Cek kapasitas sesi
function countBookingsFor(tanggal, session) {
  // Max 3 bookings per session
}

// Cek konflik modul
function isSessionTakenBySameModule(tanggal, session, modulId) {
  // Modul yang sama tidak boleh di sesi yang sama
}
```

### 9. Dashboard Admin (`admin.html`, `admin.js`)

**Hanya untuk Admin**

**Fitur:**
- Tabel semua nilai praktikan
- Chart statistik per mahasiswa
- Filter & sorting data
- Export data (copy to clipboard)
- Manajemen user (view NRP, Nama, Kelompok)
- Statistik global (rata-rata per modul)

**Auth Guard:**
```javascript
ensureAdminOrRedirect() {
  const isAsisten = role === 'Asisten Laboratorium';
  const isAdmin = user.admin === true;
  if (!isAsisten || !isAdmin) {
    redirect('home.html');
  }
}
```

### 10. Kontak Asisten (`kontak.html`, `kontak.js`)

**Fitur:**
- Grid card asisten laboratorium
- Filter by modul
- WhatsApp direct link
- Email contact
- Foto profil asisten

### 11. Shared Components

#### `sidebar.js` (Global Navigation & Auth)
- Auth guard semua halaman (kecuali `index.html`)
- Sidebar toggle (hamburger menu)
- Dark mode toggle (persistent via localStorage)
- Role-based menu visibility
- Logout handler
- Responsive overlay

**Dark Mode:**
```javascript
// Persistent dark mode
const isDark = localStorage.getItem('fislab-theme') === 'dark';
document.body.classList.toggle('dark', isDark);
```

#### `style.css` (Global Styles)
- CSS Variables untuk theming
- Dark mode color scheme
- Responsive grid system
- Card components
- Button variants
- Form styling
- Animation utilities

**CSS Variables:**
```css
:root {
  --primary-gold: #CFA348;
  --bg-gradient: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
  --card-bg: #ffffff;
  --text-color: #1a1a1a;
}

body.dark {
  --card-bg: #2d2d2d;
  --text-color: #ffffff;
}
```

---

## 💻 Teknologi

### Frontend Stack

| Teknologi | Versi | Penggunaan |
|-----------|-------|------------|
| **HTML5** | - | Struktur halaman, semantic markup |
| **CSS3** | - | Styling, animations, dark mode |
| **JavaScript (ES6+)** | - | Logic, DOM manipulation, async operations |
| **Chart.js** | 3.x | Data visualization (bar charts) |
| **MathJax** | 3.x | LaTeX math rendering |
| **Inter Font** | - | UI typography |

### Backend/Database

| Teknologi | Penggunaan |
|-----------|------------|
| **Firebase Realtime Database** | Primary database, real-time sync |
| **Firebase Authentication** | (Optional, saat ini custom auth) |
| **Supabase** | (Optional integration, belum fully implemented) |

### Build Tools

| Tool | Penggunaan |
|------|------------|
| **Node.js** | Runtime untuk skrip build |
| **Pandoc** | Konversi LaTeX → HTML |

### External APIs

- **UI-Avatars**: Fallback avatar generation
- **WhatsApp Web API**: Direct messaging link

---

## 📁 Struktur Folder

```
General for Com/
├── index.html              # Login page
├── index.js                # Login logic
├── home.html               # Dashboard utama
├── home.js                 # Dashboard logic
├── admin.html              # Admin dashboard
├── admin.js                # Admin logic
├── profile.html            # Profile management
├── profile.js              # Profile logic
├── modul.html              # Modul list page
├── view-modul.html         # Modul viewer
├── view-modul.js           # Modul viewer logic
├── view-pengolahan.html    # Data processing viewer
├── view-pengolahan.js      # Data processing logic
├── jadwal.html             # Schedule page
├── jadwal.js               # Schedule logic
├── penjadwal.html          # Schedule management (asisten)
├── penjadwal.js            # Scheduling logic
├── nilai.html              # Grades page (praktikan)
├── nilai.js                # Grades logic
├── penilaian.html          # Grading page (asisten)
├── penilaian.js            # Grading logic
├── kontak.html             # Contact page
├── kontak.js               # Contact logic
├── sidebar.js              # Shared navigation & auth guard
├── style.css               # Global styles
├── firebase-config.js      # Firebase credentials (gitignored)
├── firebase-config.js.example # Firebase config template
├── supabase-config.js      # Supabase credentials
├── README.md               # Dokumentasi (file ini)
│
├── modul/                  # LaTeX source files
│   ├── Pengolahan_Data.tex
│   ├── Gambar/             # Image assets
│   ├── MP/                 # Modern Physics modules
│   │   ├── Franck_Hertz.tex
│   │   ├── Hysteresis_Magnet.tex
│   │   ├── Konstanta_Planck.tex
│   │   ├── Milikan.tex
│   │   └── Radioaktivitas.tex
│   └── W/                  # Wave modules
│       ├── Cincin_Newton.tex
│       ├── Difraksi.tex
│       ├── Gelombang_Mekanik.tex
│       ├── Polarisasi.tex
│       └── Spektroskopi.tex
│
├── public/
│   └── modul-html/         # Generated HTML from LaTeX
│       ├── Data.html
│       ├── MP1.html - MP5.html
│       └── W1.html - W5.html
│
├── scripts/
│   └── convert-tex.js      # LaTeX to HTML converter
│
├── Epstein Files/          # Avatar animation frames
│   └── Eins1.png - Eins12.png
│
├── loader/                 # Loading assets
└── favicon.svg             # Site icon
```

---

## ⚙️ Instalasi & Setup

### Prasyarat

- **Node.js** (v14+) dan npm
- **Pandoc** (untuk konversi LaTeX)
- **Live Server** atau web server lokal
- **Firebase Project** dengan Realtime Database

### Langkah Instalasi

#### 1. Clone Repository

```bash
git clone <repository-url>
cd "General for Com"
```

#### 2. Install Dependencies

```bash
# Install Pandoc (jika belum)
# Windows (Chocolatey)
choco install pandoc

# macOS (Homebrew)
brew install pandoc

# Linux (apt)
sudo apt-get install pandoc

# Tidak ada npm dependencies untuk app utama
# Dependencies dimuat via CDN di HTML
```

#### 3. Konfigurasi Firebase

Buat file `firebase-config.js` dari template:

```bash
cp firebase-config.js.example firebase-config.js
```

Edit `firebase-config.js`:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "your-project.firebaseapp.com",
  databaseURL: "https://your-project.firebaseio.com",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};

firebase.initializeApp(firebaseConfig);
```

#### 4. Konfigurasi Supabase (Optional)

Edit `supabase-config.js`:

```javascript
const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = 'your_anon_key';
```

#### 5. Konversi Modul LaTeX → HTML

```bash
node scripts/convert-tex.js
```

Output akan tersimpan di `public/modul-html/`.

#### 6. Setup Firebase Realtime Database

Buat struktur database di Firebase Console:

```json
{
  "users": {
    "5026221001": {
      "nrp": "5026221001",
      "nama": "Admin User",
      "password": "admin123",
      "role": "Asisten Laboratorium",
      "admin": true,
      "judul": ["MP1", "MP2"]
    }
  },
  "kelompok": {
    "kelompok 1": {
      "namaKelompok": "Kelompok 1"
    }
  },
  "judulPraktikum": {
    "MP1": {
      "namaJudul": "Konstanta Planck"
    }
  }
}
```

**Firebase Rules (untuk development):**

```json
{
  "rules": {
    ".read": "auth != null",
    ".write": "auth != null"
  }
}
```

**Firebase Rules (untuk production):**

```json
{
  "rules": {
    "users": {
      "$uid": {
        ".read": "auth.uid === $uid",
        ".write": "auth.uid === $uid"
      }
    },
    "kelompok": {
      ".read": "auth != null",
      ".write": "root.child('users').child(auth.uid).child('admin').val() === true"
    }
  }
}
```

#### 7. Jalankan Development Server

```bash
# Menggunakan Live Server (VS Code extension)
# Atau Python simple server
python -m http.server 8000

# Atau Node.js http-server
npx http-server -p 8000
```

Akses: `http://localhost:8000/index.html`

---

## 🔧 Konfigurasi

### Environment Variables

Buat file `.env` untuk konfigurasi tambahan (optional):

```env
FIREBASE_API_KEY=your_api_key
FIREBASE_AUTH_DOMAIN=your_auth_domain
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_key
```

### Firebase Configuration

File `firebase-config.js` harus berisi:

```javascript
const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  databaseURL: "https://....firebaseio.com", // WAJIB untuk Realtime DB
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
};

firebase.initializeApp(firebaseConfig);
```

### Pandoc Configuration

File `scripts/convert-tex.js` menggunakan Pandoc dengan opsi:

```javascript
const args = [
  '-f', 'latex',        // Input format: LaTeX
  '-t', 'html',         // Output format: HTML
  '--mathjax',          // Enable MathJax
  '-o', dstPath,        // Output file
  srcPath               // Input file
];
```

---

## 🚀 Deployment

### Firebase Hosting

#### 1. Install Firebase CLI

```bash
npm install -g firebase-tools
```

#### 2. Login ke Firebase

```bash
firebase login
```

#### 3. Initialize Project

```bash
firebase init hosting
```

Pilihan:
- Public directory: `.` (root folder)
- Configure as single-page app: **No**
- Set up automatic builds: **No**

#### 4. Deploy

```bash
firebase deploy --only hosting
```

URL: `https://your-project.firebaseapp.com`

### GitHub Pages

#### 1. Setup Repository Settings

- Settings → Pages → Source: `main` branch, `/` (root)

#### 2. Update Config Paths

Pastikan semua path absolut diubah ke relatif:

```html
<!-- Sebelum -->
<link rel="stylesheet" href="/style.css">

<!-- Sesudah -->
<link rel="stylesheet" href="style.css">
```

#### 3. Push to GitHub

```bash
git add .
git commit -m "Deploy to GitHub Pages"
git push origin main
```

URL: `https://yourusername.github.io/repo-name`

### Netlify

#### 1. Drag & Drop Deploy

- Login ke Netlify
- Drag folder project ke dashboard
- Otomatis deploy

#### 2. Custom Domain (Optional)

- Site settings → Domain management
- Add custom domain

### Vercel

```bash
npm install -g vercel
vercel
```

Follow prompts, deploy otomatis.

---

## 🔒 Keamanan

### Best Practices

#### 1. Credential Management

**JANGAN** commit file berikut:
- `firebase-config.js`
- `.env`
- Folder `node_modules/`

Tambahkan ke `.gitignore`:

```gitignore
firebase-config.js
.env
.env.local
node_modules/
.DS_Store
```

#### 2. Firebase Security Rules

Gunakan rules yang ketat untuk production:

```json
{
  "rules": {
    "users": {
      "$nrp": {
        ".read": "$nrp === auth.uid || root.child('users').child(auth.uid).child('admin').val() === true",
        ".write": "$nrp === auth.uid || root.child('users').child(auth.uid).child('admin').val() === true",
        "password": {
          ".read": "$nrp === auth.uid",
          ".write": "$nrp === auth.uid"
        },
        "nilai": {
          ".read": "$nrp === auth.uid || root.child('users').child(auth.uid).child('role').val() === 'Asisten Laboratorium'",
          ".write": "root.child('users').child(auth.uid).child('role').val() === 'Asisten Laboratorium'"
        }
      }
    },
    "kelompok": {
      ".read": "auth != null",
      ".write": "root.child('users').child(auth.uid).child('role').val() === 'Asisten Laboratorium'"
    },
    "judulPraktikum": {
      ".read": "auth != null",
      ".write": "root.child('users').child(auth.uid).child('admin').val() === true"
    }
  }
}
```

#### 3. Password Hashing

**REKOMENDASI:** Implementasi password hashing untuk production.

```javascript
// Gunakan bcrypt atau library serupa
// JANGAN simpan plain text password
const hashedPassword = await bcrypt.hash(password, 10);
```

#### 4. Input Validation

Semua input user di-validate:

```javascript
// Contoh dari penilaian.js
function clampScore(v) {
  const n = parseFloat(v);
  if (isNaN(n)) return null;
  return Math.max(0, Math.min(100, n)); // Clamp 0-100
}
```

#### 5. XSS Prevention

Escape HTML untuk mencegah XSS:

```javascript
function escAttr(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}
```

---

## 🛠️ Pengembangan

### Adding New Module

#### 1. Tambah LaTeX Source

Simpan file `.tex` di `modul/MP/` atau `modul/W/`:

```bash
modul/MP/New_Module.tex
```

#### 2. Update Mapping

Edit `scripts/convert-tex.js`:

```javascript
const MP_MAP = {
  MP1: 'Konstanta_Planck.tex',
  // ... existing
  MP6: 'New_Module.tex'  // Tambahkan ini
};
```

#### 3. Convert to HTML

```bash
node scripts/convert-tex.js
```

#### 4. Update Database

Tambahkan di Firebase `/judulPraktikum`:

```json
{
  "MP6": {
    "namaJudul": "New Module Title"
  }
}
```

#### 5. Update UI

Edit `modul.html` untuk tambah card baru:

```html
<div class="module-card" data-id="MP6">
  <div class="module-icon">MP6</div>
  <div class="module-title">New Module</div>
</div>
```

### Adding New User Role

#### 1. Update Sidebar Logic

Edit `sidebar.js`:

```javascript
const role = localStorage.getItem('fislab-role');
const isNewRole = role === 'New Role Name';

// Conditional menu visibility
if (isNewRole) {
  document.getElementById('nav-new-feature').style.display = 'block';
}
```

#### 2. Create Role-Specific Page

```html
<!-- new-role-page.html -->
<script>
function ensureNewRole() {
  const role = localStorage.getItem('fislab-role');
  if (role !== 'New Role Name') {
    window.location.href = 'home.html';
  }
}
ensureNewRole();
</script>
```

### Customizing Grading Aspects

Edit `ASPEK` array di `penilaian.js`, `nilai.js`, dan `admin.js`:

```javascript
const ASPEK = [
  { key: 'pre-lab', label: 'Pre-lab', weight: 10 },
  { key: 'new-aspect', label: 'New Aspect', weight: 5 }, // Tambah aspek baru
  // ...
];
```

**PENTING:** Total bobot harus 100%.

### Customizing Theme

Edit CSS Variables di `style.css`:

```css
:root {
  --primary-gold: #CFA348;     /* Warna utama */
  --secondary-blue: #3b82f6;   /* Warna sekunder */
  --success-green: #10b981;    /* Warna sukses */
  --danger-red: #ef4444;       /* Warna bahaya */
}
```

### Debugging Tips

#### Enable Firebase Debug Mode

```javascript
// Tambahkan di firebase-config.js
firebase.database.enableLogging(true);
```

#### Console Logging

```javascript
// Tambahkan di script untuk debug
console.log('User data:', userData);
console.log('Current role:', localStorage.getItem('fislab-role'));
```

#### Network Monitoring

Gunakan DevTools → Network tab untuk monitor Firebase calls:
- Filter: `firebaseio.com`
- Check request/response payload

---

## 📚 Dokumentasi API (Firebase Realtime DB)

### Read Operations

```javascript
// Get single user
database.ref('users/' + nrp).once('value').then(snapshot => {
  const userData = snapshot.val();
});

// Get all users
database.ref('users').once('value').then(snapshot => {
  const allUsers = snapshot.val();
});

// Listen to real-time changes
database.ref('users/' + nrp).on('value', snapshot => {
  // Updates automatically
});
```

### Write Operations

```javascript
// Set (overwrite)
database.ref('users/' + nrp).set({
  nama: 'John Doe',
  email: 'john@example.com'
});

// Update (merge)
database.ref('users/' + nrp).update({
  email: 'newemail@example.com'
});

// Update nested path
database.ref('users/' + nrp + '/nilai/MP1').update({
  'pre-lab': 90,
  _updatedAt: Date.now()
});
```

### Delete Operations

```javascript
// Delete node
database.ref('users/' + nrp + '/nilai/MP1').remove();
```

---

## 🤝 Kontribusi

### Workflow

1. **Fork** repository
2. **Create branch** feature (`git checkout -b feature/AmazingFeature`)
3. **Commit** changes (`git commit -m 'Add some AmazingFeature'`)
4. **Push** to branch (`git push origin feature/AmazingFeature`)
5. **Open Pull Request**

### Coding Standards

- **HTML**: Semantic markup, accessibility (ARIA labels)
- **CSS**: BEM naming convention, CSS Variables
- **JavaScript**: ES6+, camelCase, JSDoc comments
- **Git**: Conventional Commits (feat, fix, docs, style, refactor)

### Testing Checklist

- [ ] Auth guard berfungsi di semua halaman
- [ ] Dark mode konsisten
- [ ] Responsive di mobile/tablet/desktop
- [ ] Chart rendering correct
- [ ] Form validation bekerja
- [ ] Firebase CRUD operations success
- [ ] No console errors

---

## 📄 Lisensi

Proyek ini menggunakan lisensi **MIT**. Lihat file `LICENSE` untuk detail.

```
MIT License

Copyright (c) 2024 FISLAB-II Team

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files...
```

---

## 👥 Tim Pengembang

- **Project Lead**: [Nama]
- **Frontend Developer**: [Nama]
- **Database Administrator**: [Nama]
- **Documentation**: [Nama]

---

## 📞 Dukungan

Untuk pertanyaan atau masalah:

- **Issues**: [GitHub Issues](https://github.com/your-repo/issues)
- **Email**: fislab@example.com
- **Documentation**: Baca README ini

---

## 🗺️ Roadmap

### Version 1.0 (Current)
- ✅ Basic authentication
- ✅ Role-based access control
- ✅ Grading system
- ✅ Schedule management
- ✅ Module viewer
- ✅ Dark mode

### Version 1.1 (Planned)
- [ ] Firebase Authentication integration
- [ ] Password reset functionality
- [ ] Email notifications
- [ ] Export grades to Excel
- [ ] Advanced analytics dashboard
- [ ] Mobile app (React Native)

### Version 2.0 (Future)
- [ ] AI-powered plagiarism detection
- [ ] Video conference integration
- [ ] Automated report generation
- [ ] Multi-language support
- [ ] Advanced permission system

---

**Last Updated**: 2024
**Version**: 1.0.0
