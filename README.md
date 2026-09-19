# Perinfoan Hub (perinfoan.web.id)

Selamat datang di repositori resmi **Perinfoan**! Repositori ini adalah rumah bersama untuk seluruh proyek eksperimental, hasil belajar, dan game santai yang dibuat oleh anggota circle Perinfoan di kampus.

Domain resmi: [https://perinfoan.web.id](https://perinfoan.web.id)

---

## Arsitektur Repositori

Repositori ini menggunakan struktur **Decoupled Multi-Project**. Setiap proyek berada di dalam foldernya masing-masing di bawah direktori `projects/` dengan runtime, dependensi, dan siklus hidup mandiri:

```text
perinfoan/
├── CONTEXT.md                    # Definisi istilah domain resmi
├── PRODUCT.md                    # Kebijakan & konteks produk platform
├── docs/
│   └── adr/                      # Catatan keputusan arsitektur (ADR)
├── projects/
│   ├── profile/                  # Web Profile utama (perinfoan.web.id) [Astro + Tailwind]
│   └── uno-game/                 # Contoh proyek berikutnya (uno.perinfoan.web.id)
└── README.md
```

---

## 1. Web Profile (`projects/profile`)

Web Profile utama dibangun menggunakan **Astro (SSG)** dan **Tailwind CSS**. Data profil anggota dan etalase proyek dikelola menggunakan **Astro Content Collections** berbasis Markdown (`.md`).

### Menjalankan Secara Lokal
```bash
cd projects/profile
npm install
npm run dev
```
Akses di browser melalui: `http://localhost:4321`

---

## 2. Panduan Kontribusi untuk Anggota Grup

### A. Memperbarui Data Profil Anggota (7 Anggota Tetap)
Grup Perinfoan memiliki jumlah anggota tetap sebanyak 7 orang. Setiap anggota memiliki file slot profilnya masing-masing di `projects/profile/src/content/members/` (`kevin.md`, `member-2.md` s/d `member-7.md`):

1. **Fork** atau **Clone** repositori ini ke laptop kamu.
2. Buat branch baru:
   ```bash
   git checkout -b profile/nama-kamu
   ```
3. Buka folder `projects/profile/src/content/members/`.
4. Edit file slot profil kamu (misal `member-2.md`).
5. Isi data frontmatter:
   ```markdown
   ---
   name: "Nama Lengkap"
   nickname: "Panggilan"
   role: "Peran Santai / Teknis"
   avatar: "https://link-foto-kamu.jpg"
   bio: "Deskripsi singkat tentang dirimu..."
   skills:
     - "TypeScript"
     - "Docker"
   socials:
     github: "https://github.com/username"
     linkedin: "https://linkedin.com/in/username"
   order: 2
   ---

   Tulis pesan, quote, atau cerita bebas kamu di sini!
   ```
6. Commit & Push perubahan, lalu buka **Pull Request** ke branch `main`.

---

### B. Menambahkan Proyek Baru
1. Buat folder baru di dalam `projects/<nama-project>` (misal `projects/uno-game`).
2. Masukkan kode aplikasi Anda dan sertakan `Dockerfile` serta `docker-compose.yml`.
3. Daftarkan proyek Anda ke etalase Web Profile dengan membuat file baru di `projects/profile/src/content/projects/<nama-project>.md`:
   ```markdown
   ---
   title: "Nama Proyek"
   description: "Deskripsi singkat proyek..."
   status: "in-development" # atau "live"
   subdomain: "proyek.perinfoan.web.id"
   techStack:
     - "Node.js"
     - "React"
   contributors:
     - "Nama Pembuat"
   category: "Game / Tool / Utility"
   order: 2
   ---
   ```

---

## 3. Panduan Deployment di VPS (Docker + Cloudflare Zero Trust)

Arsitektur deployment Perinfoan menggunakan **Docker** yang terhubung secara aman ke **Cloudflare Tunnel (`cloudflared`)** tanpa perlu membuka port publik (80/443) di firewall VPS.

### Langkah 1: Buat Docker Network Bersama
Di VPS, jalankan perintah ini satu kali:
```bash
docker network create perinfoan-net
```

### Langkah 2: Jalankan Cloudflare Tunnel Container
Pastikan container `cloudflared` Anda juga terhubung ke network `perinfoan-net`:
```bash
docker run -d --name cloudflared --network perinfoan-net cloudflare/cloudflared:latest tunnel --no-autoupdate run --token <TOKEN_TUNNEL_ANDA>
```

### Langkah 3: Build & Jalankan Web Profile
Di dalam direktori `projects/profile`:
```bash
docker compose up -d --build
```
Container `perinfoan-profile` (berbasis Nginx Alpine, hanya memakai ~20MB RAM) akan aktif di network `perinfoan-net`.

### Langkah 4: Routing di Cloudflare Zero Trust Dashboard
Di dashboard Cloudflare Zero Trust (Access > Tunnels):
1. Tambahkan Public Hostname:
   - **Subdomain**: (kosongkan untuk domain utama)
   - **Domain**: `perinfoan.web.id`
   - **Type**: `HTTP`
   - **URL**: `web-profile:80`
2. Untuk proyek berikutnya (misal UNO Game):
   - **Subdomain**: `uno`
   - **Domain**: `perinfoan.web.id`
   - **Type**: `HTTP`
   - **URL**: `nama-service-container:port` (contoh: `uno-game:3000`)
