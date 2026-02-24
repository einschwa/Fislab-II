# FISLAB-II Quick Reference Guide

Panduan cepat untuk task-task umum dalam pengembangan dan penggunaan FISLAB-II.

---

## 🚀 Quick Start

### Setup Project (First Time)

```bash
# 1. Clone repository
git clone <repo-url>
cd "General for Com"

# 2. Copy config files
cp firebase-config.js.example firebase-config.js
cp .env.example .env

# 3. Edit firebase-config.js dengan credentials Anda

# 4. Convert modul (jika ada perubahan LaTeX)
node scripts/convert-tex.js

# 5. Start local server
# Option A: VS Code Live Server
# Option B: Python
python -m http.server 8000
# Option C: Node.js
npx http-server -p 8000

# 6. Open browser
# http://localhost:8000/index.html
```

### Default Admin Login

Edit di Firebase Console untuk membuat admin pertama:

```json
{
  "users": {
    "admin001": {
      "nrp": "admin001",
      "password": "admin123",
      "nama": "Administrator",
      "role": "Asisten Laboratorium",
      "admin": true,
      "email": "admin@fislab.ac.id"
    }
  }
}
```

---

## 📝 Common Tasks

### Menambah User Baru

**Via Firebase Console:**
```
Database → users → Add Child
```

**Struktur Praktikan:**
```json
{
  "5026221234": {
    "nrp": "5026221234",
    "password": "password123",
    "nama": "John Doe",
    "email": "john@student.its.ac.id",
    "role": "Praktikan",
    "kelompokId": "kelompok 1",
    "telepon": "081234567890"
  }
}
```

**Struktur Asisten:**
```json
{
  "5026220001": {
    "nrp": "5026220001",
    "password": "password123",
    "nama": "Jane Doe",
    "email": "jane@fislab.ac.id",
    "role": "Asisten Laboratorium",
    "admin": false,
    "judul": ["MP1", "MP2"],
    "telepon": "081234567890"
  }
}
```

### Menambah Kelompok Baru

**Firebase Console:**
```
Database → kelompok → Add Child
```

```json
{
  "kelompok 5": {
    "namaKelompok": "Kelompok 5",
    "MP1": {
      "week": 1,
      "aslab": ["5026220001"]
    },
    "W1": {
      "week": 2,
      "aslab": ["5026220002"]
    }
  }
}
```

### Menambah Modul Praktikum Baru

**1. Tambah LaTeX Source:**
```bash
# Simpan di modul/MP/ atau modul/W/
modul/MP/New_Module.tex
```

**2. Update Mapping:**
Edit `scripts/convert-tex.js`:
```javascript
const MP_MAP = {
  MP1: 'Konstanta_Planck.tex',
  MP2: 'Milikan.tex',
  // ...
  MP6: 'New_Module.tex'  // ← Tambah ini
};
```

**3. Convert:**
```bash
node scripts/convert-tex.js
```

**4. Update Database:**
```json
// Database → judulPraktikum
{
  "MP6": {
    "namaJudul": "New Module Title",
    "kategori": "Modern Physics"
  }
}
```

**5. Update UI:**
Edit `modul.html`, tambahkan card:
```html
<div class="module-card" data-id="MP6">
    <div class="module-icon">MP6</div>
    <div class="module-title" id="title-MP6">New Module</div>
    <button class="module-btn">Lihat Modul</button>
</div>
```

### Mengubah Sistem Penilaian

**Edit Aspek & Bobot:**

File yang perlu diubah:
- `penilaian.js`
- `nilai.js`
- `admin.js`
- `home.js`

```javascript
const ASPEK = [
    { key: 'pre-lab', label: 'Pre-lab', weight: 10 },
    { key: 'in-lab', label: 'In-lab', weight: 10 },
    // ... edit atau tambah aspek
    { key: 'new-aspect', label: 'New Aspect', weight: 5 }
];
```

**PENTING:** Total weight harus = 100%

### Reset Password User

**Manual via Firebase Console:**
```
Database → users → {nrp} → password
```

Ubah nilai password field.

**Programmatic (Future):**
```javascript
// Akan ditambahkan di v1.1
database.ref('users/' + nrp).update({
  password: newHashedPassword
});
```

### Export Nilai ke Excel

**Saat ini (Copy to Clipboard):**
1. Buka `admin.html`
2. Klik tombol "Export Data"
3. Paste di Excel

**Future (v1.1):** Export langsung ke .xlsx file

---

## 🎨 Customization

### Mengubah Warna Tema

Edit `style.css`:

```css
:root {
  --primary-gold: #CFA348;       /* Warna utama */
  --secondary-blue: #3b82f6;     /* Accent */
  --success-green: #10b981;      /* Success state */
  --warning-yellow: #f59e0b;     /* Warning */
  --danger-red: #ef4444;         /* Error/Danger */
  
  /* Dark mode colors */
  --bg-dark: #1a1a1a;
  --card-dark: #2d2d2d;
  --text-dark: #ffffff;
}
```

### Mengubah Font

Edit `style.css`:

```css
/* Ganti font family */
:root {
  --font-primary: 'Inter', sans-serif;  /* ← Ganti ini */
}
```

Update link di semua HTML:

```html
<!-- Ganti Google Fonts link -->
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">
```

### Mengubah Logo

**Text Logo (Φ):**

Edit semua HTML files, cari:
```html
<span class="header-logo">Φ</span>
```

Ganti dengan logo/text lain.

**Image Logo:**

```html
<!-- Ganti di header -->
<img src="logo.png" alt="FISLAB-II" class="header-logo-img">
```

CSS:
```css
.header-logo-img {
  height: 32px;
  width: auto;
}
```

---

## 🐛 Debugging

### Enable Firebase Debug Logging

Edit `firebase-config.js`:

```javascript
firebase.database.enableLogging(true);
```

### Check Auth State

Console commands:

```javascript
// Current user NRP
localStorage.getItem('fislab-nrp')

// Current role
localStorage.getItem('fislab-role')

// Is admin
localStorage.getItem('fislab-admin')

// Clear session (logout)
localStorage.removeItem('fislab-nrp');
localStorage.removeItem('fislab-role');
localStorage.removeItem('fislab-admin');
```

### Common Errors

#### "Not logged in" loop
**Cause:** localStorage cleared atau corrupted
**Fix:**
```javascript
// Open console, run:
localStorage.clear();
// Then login again
```

#### Firebase "Permission Denied"
**Cause:** Firebase rules too strict
**Fix:** Update rules di Firebase Console
```json
{
  "rules": {
    ".read": "auth != null",   // Loosen for development
    ".write": "auth != null"
  }
}
```

#### Chart not rendering
**Cause:** Chart.js CDN blocked atau DOM not ready
**Fix:**
```javascript
// Ensure Chart.js loaded
if (typeof Chart === 'undefined') {
  console.error('Chart.js not loaded');
}

// Render after DOM ready
document.addEventListener('DOMContentLoaded', () => {
  buildChart();
});
```

#### Module content not loading
**Cause:** 
1. HTML file tidak ada di `public/modul-html/`
2. File path salah

**Fix:**
```bash
# Re-convert modules
node scripts/convert-tex.js

# Check file exists
ls public/modul-html/
```

---

## 📊 Database Queries

### Get All Students

```javascript
database.ref('users')
  .orderByChild('role')
  .equalTo('Praktikan')
  .once('value')
  .then(snapshot => {
    const students = snapshot.val();
    console.log(students);
  });
```

### Get Student Grades

```javascript
const nrp = '5026221234';
database.ref('users/' + nrp + '/nilai').once('value')
  .then(snapshot => {
    const grades = snapshot.val();
    console.log(grades);
  });
```

### Update Schedule

```javascript
const kelompokId = 'kelompok 1';
const modulId = 'MP1';

database.ref('kelompok/' + kelompokId + '/' + modulId).update({
  'tanggal': '2024-03-15',
  'jam-awal': '07:00',
  'jam-akhir': '09:00'
});
```

### Bulk Update (Batch)

```javascript
const updates = {};
updates['users/5026221234/email'] = 'newemail@example.com';
updates['users/5026221234/telepon'] = '081234567890';
updates['users/5026221235/email'] = 'another@example.com';

database.ref().update(updates);
```

---

## 🚀 Deployment

### Firebase Hosting

```bash
# Install CLI
npm install -g firebase-tools

# Login
firebase login

# Init
firebase init hosting

# Deploy
firebase deploy --only hosting
```

### GitHub Pages

```bash
# Ensure all paths are relative (no leading /)
# Push to GitHub
git add .
git commit -m "Deploy to GitHub Pages"
git push origin main

# Enable in Settings → Pages
```

### Update After Deploy

1. Clear browser cache
2. Hard refresh (Ctrl+F5)
3. Check console for errors

---

## 📱 Testing

### Browser Compatibility

Test di:
- Chrome/Edge (Chromium)
- Firefox
- Safari (macOS/iOS)

### Responsive Testing

Chrome DevTools → Device toolbar:
- Mobile: 375px (iPhone SE)
- Tablet: 768px (iPad)
- Desktop: 1920px (Full HD)

### Accessibility Testing

```bash
# Install extension
# - WAVE (Chrome)
# - axe DevTools

# Test keyboard navigation
# - Tab through all interactive elements
# - Enter/Space to activate

# Test screen reader
# - NVDA (Windows)
# - VoiceOver (macOS)
```

---

## 🔧 Useful Commands

### Git

```bash
# Check status
git status

# Stage all changes
git add .

# Commit with message
git commit -m "feat: add new feature"

# Push to remote
git push origin main

# Pull latest changes
git pull origin main

# Create new branch
git checkout -b feature/new-feature

# Switch branch
git checkout main
```

### Node/Pandoc

```bash
# Check versions
node --version
pandoc --version

# Convert single file
pandoc -f latex -t html --mathjax -o output.html input.tex

# Watch mode (auto-convert on save)
# Install nodemon: npm install -g nodemon
nodemon --watch modul --exec "node scripts/convert-tex.js"
```

---

## 📞 Support

Jika mengalami masalah:

1. **Check Documentation:** Baca README.md
2. **Search Issues:** Cari di GitHub Issues
3. **Ask Question:** Buat issue baru dengan label "question"
4. **Emergency:** Email fislab@example.com

---

**Last Updated:** 2024
**Version:** 1.0.0
