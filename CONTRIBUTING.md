# Panduan Kontribusi FISLAB-II

Terima kasih atas minat Anda untuk berkontribusi pada FISLAB-II! Dokumen ini memberikan panduan untuk berkontribusi pada proyek.

## 📋 Cara Berkontribusi

### 1. Fork Repository

Klik tombol "Fork" di halaman GitHub untuk membuat salinan repository di akun Anda.

### 2. Clone Fork Anda

```bash
git clone https://github.com/username-anda/fislab-ii.git
cd fislab-ii
```

### 3. Buat Branch Baru

```bash
git checkout -b feature/nama-fitur
# atau
git checkout -b fix/nama-bug
```

### 4. Lakukan Perubahan

- Ikuti coding standards yang ada
- Tulis kode yang bersih dan mudah dipahami
- Tambahkan komentar jika diperlukan

### 5. Test Perubahan

- Test semua fitur yang diubah
- Pastikan tidak ada error di console
- Cek responsiveness di berbagai ukuran layar
- Test di berbagai browser (Chrome, Firefox, Safari)

### 6. Commit Perubahan

Gunakan conventional commits:

```bash
git commit -m "feat: menambahkan fitur export Excel"
git commit -m "fix: perbaikan bug pada penjadwalan"
git commit -m "docs: update dokumentasi API"
```

**Conventional Commit Types:**
- `feat`: Fitur baru
- `fix`: Perbaikan bug
- `docs`: Perubahan dokumentasi
- `style`: Perubahan format kode (tidak mengubah logic)
- `refactor`: Refactoring kode
- `test`: Menambah atau memperbaiki test
- `chore`: Perubahan pada build process atau tools

### 7. Push ke Fork

```bash
git push origin feature/nama-fitur
```

### 8. Buat Pull Request

- Buka GitHub dan navigate ke repository asli
- Klik "New Pull Request"
- Pilih branch Anda
- Isi deskripsi PR dengan detail:
  - Apa yang diubah
  - Mengapa perubahan diperlukan
  - Screenshot (jika ada perubahan UI)
  - Issue yang diselesaikan (jika ada)

## 🎨 Coding Standards

### HTML

- Gunakan semantic HTML5 elements
- Tambahkan ARIA labels untuk accessibility
- Indent menggunakan 4 spasi
- Gunakan lowercase untuk tag dan atribut

```html
<!-- ✅ Good -->
<button id="submit-btn" type="submit" aria-label="Submit form">
    Submit
</button>

<!-- ❌ Bad -->
<BUTTON id=submitBtn>Submit</BUTTON>
```

### CSS

- Gunakan CSS Variables untuk theming
- Ikuti BEM naming convention
- Grup properties: layout → box model → typography → visual
- Mobile-first responsive design

```css
/* ✅ Good */
.card {
    /* Layout */
    display: flex;
    flex-direction: column;
    
    /* Box Model */
    padding: var(--spacing-md);
    margin-bottom: var(--spacing-lg);
    
    /* Typography */
    font-size: var(--font-size-base);
    
    /* Visual */
    background: var(--card-bg);
    border-radius: var(--radius-lg);
}

/* ❌ Bad */
.card {
    background: #ffffff;
    padding: 16px;
    font-size: 14px;
    margin-bottom: 24px;
}
```

### JavaScript

- Gunakan ES6+ syntax
- CamelCase untuk variabel dan fungsi
- PascalCase untuk classes
- UPPER_CASE untuk konstanta
- Tambahkan JSDoc comments untuk fungsi penting

```javascript
// ✅ Good
/**
 * Calculate final grade based on aspects and plagiarism penalty
 * @param {Object} nilai - Grade object with aspects
 * @returns {number|null} Final grade or null if invalid
 */
function computeFinalTotal(nilai) {
    if (!nilai) return null;
    let total = 0;
    // ...
    return total;
}

// ❌ Bad
function calc(n) {
    var t = 0;
    // ...
    return t;
}
```

### Git Commits

- Gunakan present tense ("add feature" bukan "added feature")
- Gunakan imperative mood ("move cursor" bukan "moves cursor")
- Limit first line ke 72 karakter
- Gunakan body untuk explain "what" dan "why" (bukan "how")

```bash
# ✅ Good
feat: add Excel export functionality

Add ability to export student grades to Excel format.
This allows administrators to process data offline.

Closes #123

# ❌ Bad
added export
```

## 🧪 Testing Checklist

Sebelum submit Pull Request, pastikan:

- [ ] Kode berjalan tanpa error
- [ ] Tidak ada console.log yang tertinggal (kecuali untuk debugging purpose)
- [ ] Auth guard berfungsi di semua halaman
- [ ] Dark mode konsisten
- [ ] Responsive di mobile (375px), tablet (768px), desktop (1920px)
- [ ] Cross-browser compatible (Chrome, Firefox, Safari, Edge)
- [ ] Form validation bekerja
- [ ] Firebase operations success
- [ ] No accessibility issues (test dengan screen reader)

## 🐛 Melaporkan Bug

Buat issue baru dengan template:

```markdown
**Deskripsi Bug:**
[Deskripsi singkat bug]

**Langkah Reproduksi:**
1. Buka halaman...
2. Klik tombol...
3. Lihat error...

**Expected Behavior:**
[Apa yang seharusnya terjadi]

**Actual Behavior:**
[Apa yang sebenarnya terjadi]

**Screenshots:**
[Jika ada]

**Environment:**
- Browser: Chrome 120
- OS: Windows 11
- Screen size: 1920x1080

**Console Errors:**
```
[Paste error dari console]
```
```

## 💡 Request Fitur Baru

Buat issue dengan label "enhancement":

```markdown
**Fitur yang Diusulkan:**
[Deskripsi fitur]

**Use Case:**
[Kapan fitur ini akan berguna]

**Contoh Implementasi:**
[Jika ada ide implementasi]

**Alternatif yang Sudah Dipertimbangkan:**
[Solusi alternatif]
```

## 📁 Struktur Project yang Baik

Saat menambahkan file baru:

```
├── halaman-baru.html       # UI halaman
├── halaman-baru.js         # Logic halaman
└── style.css               # Update styles (jangan buat file CSS baru)
```

Jangan:
- Buat file CSS terpisah untuk setiap halaman
- Duplikasi kode yang sudah ada
- Hardcode values (gunakan CSS variables)

## 🔍 Code Review Process

Pull Request akan di-review berdasarkan:

1. **Functionality**: Apakah fitur bekerja sesuai harapan?
2. **Code Quality**: Apakah kode mudah dibaca dan maintain?
3. **Performance**: Apakah ada impact negatif pada performance?
4. **Security**: Apakah ada security vulnerabilities?
5. **Documentation**: Apakah ada dokumentasi yang perlu diupdate?

## ❓ Pertanyaan

Jika ada pertanyaan:
- Buka issue baru dengan label "question"
- Atau contact maintainer di email

## 🙏 Terima Kasih

Kontribusi Anda sangat berarti untuk proyek ini. Terima kasih telah meluangkan waktu untuk berkontribusi!
