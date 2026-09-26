# 🌐 Perinfoan Web Profile

> Rumah digital dan etalase karya bersama lingkaran Perinfoan.  
> Domain resmi: [https://perinfoan.web.id](https://perinfoan.web.id)

---

## 📌 Deskripsi Proyek

Web Profile utama Perinfoan dibangun dengan **Astro** dan **Tailwind CSS** mengusung arsitektur *Static Site Generation (SSG)* yang sangat ringan (~15–20MB RAM) dan berestetika *Indie Studio Zine & Collector Trading Cards*.

Seluruh data anggota dan etalase proyek dikelola secara kolaboratif menggunakan **Astro Content Collections** dengan validasi skema Zod.

---

## 📂 Struktur Proyek

```text
projects/profile/
├── public/                     # Aset statis publik (favicon, icons)
├── src/
│   ├── content/                # Content Collections (Data Markdown)
│   │   ├── members/            # Kartu profil anggota (kresna.md, mas-chris.md, dll)
│   │   └── projects/           # Showcase proyek (web-profile.md, uno-game.md)
│   ├── layouts/                # Template layout halaman (Layout.astro)
│   ├── pages/                  # Halaman web utama (index.astro)
│   ├── styles/                 # Styling global & tema zine (global.css)
│   └── content.config.ts       # Definisi skema Zod content collections
├── astro.config.mjs            # Konfigurasi Astro & Tailwind CSS v4
├── Dockerfile                  # Multi-stage build Nginx Alpine
└── docker-compose.yml          # Konfigurasi container di perinfoan-net
```

---

## 🤝 Panduan Kontribusi Anggota (Update Kartu Profil)

Setiap anggota Perinfoan dapat memperbarui profil kartu masing-masing melalui GitHub Pull Request:

1. **Buat Branch Baru**:
   ```bash
   git checkout -b profile/nama-kamu
   ```
2. **Edit / Tambah File Profil**:
   Buka folder `src/content/members/`, pilih atau buat file markdown baru (misal `nama-kamu.md`). Isi frontmatter sesuai format:
   ```yaml
   ---
   name: "Nama Lengkap"
   nickname: "Panggilan"
   role: "Peran / Keahlian Utama"
   avatar: "https://tautan-foto-avatar-kamu.jpg"
   bio: "Deskripsi singkat tentang dirimu."
   quote: "Kutipan favorit atau celotehan santai."
   skills:
     - "TypeScript"
     - "React"
     - "Docker"
   socials:
     github: "https://github.com/username"
     linkedin: "https://linkedin.com/in/username"
     instagram: "https://instagram.com/username"
     website: "https://portofolio-kamu.com"
   order: 1 # Nomor slot urutan kartu
   ---
   ```
3. **Uji Build Lokal**:
   ```bash
   npm run build
   ```
4. **Commit & Buat Pull Request**:
   Push branch kamu ke GitHub dan ajukan Pull Request ke branch `main`.

---

## 🚀 Menjalankan Secara Lokal

```bash
# Install dependensi
npm install

# Jalankan server development
npm run dev

# Build file statis produksi (ke folder dist/)
npm run build

# Preview hasil build produksi
npm run preview
```
