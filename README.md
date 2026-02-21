<!--
  README untuk proyek Fislab-II
  Dibuat otomatis oleh asisten.
-->
# Fislab-II — Web Manajemen Laboratorium Fisika Dasar 2

![HTML](https://img.shields.io/badge/HTML-E34F26?logo=html5&logoColor=white)
![CSS](https://img.shields.io/badge/CSS-1572B6?logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=black)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?logo=supabase&logoColor=white)

Deskripsi singkat: Portal web untuk manajemen praktikum dan administrasi laboratorium Fisika Dasar 2. Situs ini memfasilitasi praktikan dan asisten laboratorium dengan fitur pengelolaan modul, nilai, dan penjadwalan praktikum.

---

## Daftar Isi

- [Fitur Utama](#fitur-utama)
- [Teknologi](#teknologi)
- [Struktur Folder (ringkas)](#struktur-folder-ringkas)
- [Persiapan Lokal & Instalasi](#persiapan-lokal--instalasi)
- [Penggunaan](#penggunaan)
- [Keamanan & Kredensial](#keamanan--kredensial)
- [Kontribusi](#kontribusi)
- [Lisensi](#lisensi)

---

## Fitur Utama

- Modul Interaktif: Konversi otomatis dokumen LaTeX (`.tex`) menjadi halaman HTML menggunakan skrip `scripts/convert-tex.js`.
- Dashboard Asisten/Admin: Halaman manajemen nilai (`nilai.html`), penjadwalan (`penjadwal.html`), dan pengolahan data.
- Autentikasi & Database: Integrasi Supabase (database + auth) dan Firebase untuk fitur tertentu.
- Pengelolaan Modul: Halaman `public/modul-html/` berisi konversi modul seperti Polarisasi, Difraksi, Cincin Newton, Spektroskopi, dll.
- Keamanan Terpusat: Penggunaan environment variables (`.env`) dan file konfigurasi `firebase-config.js`.

## Teknologi

- Frontend: Vanilla HTML, CSS, JavaScript (ES6 modules)
- Backend / Database: Supabase (Postgres + Auth) dan Firebase
- Tooling: Node.js untuk skrip otomatisasi (`scripts/convert-tex.js`)

## Struktur Folder (ringkas)

- `index.html`, `home.html`, `admin.html`, `profile.html` — Halaman utama
- `*.js` — Script front-end (mis. `index.js`, `sidebar.js`)
- `modul/` — Sumber LaTeX modul dan aset gambar
- `public/modul-html/` — Output halaman HTML hasil konversi modul
- `scripts/convert-tex.js` — Skrip konversi LaTeX → HTML
- `firebase-config.js.example`, `.env.example` — Contoh konfigurasi kredensial

## Persiapan Lokal & Instalasi

Ikuti langkah berikut untuk menjalankan proyek secara lokal:

1. Clone repositori:

```bash
git clone <URL_REPO>
cd <nama-folder-repo>
```

2. Duplikasi file konfigurasi contoh dan isi kredensial Anda:

- Salin `.env.example` menjadi `.env` dan isi variabel environment Supabase/Firebase Anda.
- Salin `firebase-config.js.example` menjadi `firebase-config.js` dan masukkan konfigurasi Firebase Anda.

PENTING: Jangan pernah meng-commit file `.env` atau `firebase-config.js` berisi kredensial nyata ke repositori publik. Tambahkan ke `.gitignore` bila perlu.

3. (Opsional) Jalankan skrip konversi modul jika Anda akan menghasilkan/ memperbarui HTML modul dari sumber `.tex`:

```bash
node scripts/convert-tex.js
```

4. Buka proyek di editor (disarankan VS Code) dan gunakan ekstensi Live Server untuk menjalankan secara lokal, karena proyek menggunakan modul ES6 di browser.

## Penggunaan

- Setelah konfigurasi kredensial selesai dan server statis dijalankan (mis. Live Server), akses:
  - Halaman pengguna: `index.html` / `home.html`
  - Admin/Asisten: `admin.html` (atau rute yang sesuai)
  - Modul hasil konversi: `public/modul-html/` (buka file HTML yang relevan)

## Keamanan & Kredensial

- Simpan semua API keys dan URL database di environment variables (`.env`) dan/atau `firebase-config.js` yang hanya ada secara lokal.
- Pastikan repository publik memiliki `.gitignore` yang mengecualikan `.env`, `firebase-config.js`, dan file lain yang berisi rahasia.

## Kontribusi

- Jika Anda ingin berkontribusi, silakan buat branch fitur, lakukan perubahan, dan ajukan Pull Request. Sertakan deskripsi perubahan dan langkah reproduksi bila perlu.

## Lisensi

Proyek ini menggunakan lisensi MIT. Lihat file `LICENSE` untuk detail lebih lanjut.

---

Jika Anda ingin, saya bisa juga:

- Menambahkan file `LICENSE` (MIT) ke repositori.
- Menambahkan template `.gitignore` yang mengecualikan `.env` dan `firebase-config.js`.

Terima kasih — beri tahu saya jika Anda ingin penyesuaian bahasa atau menambahkan bagian teknis seperti contoh struktur DB Supabase.
