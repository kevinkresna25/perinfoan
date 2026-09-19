# Perinfoan

> Rumah digital dan wadah eksperimen perangkat lunak mahasiswa circle Perinfoan.  
> Domain resmi: [https://perinfoan.web.id](https://perinfoan.web.id)

---

## 📌 Sekilas Tentang Perinfoan

**Perinfoan** berawal dari grup diskusi dan tempat nongkrong santai semasa kuliah. Di sela-sela waktu kuliah dan tugas, kami sering berdiskusi tentang teknologi, bermain game bersama, dan membangun berbagai proyek eksperimental yang menyenangkan.

Repositori ini menggunakan arsitektur **Decoupled Multi-Project**, di mana setiap proyek berdiri mandiri di foldernya masing-masing, memiliki runtime/stack sendiri, dan di-deploy ke subdomain resmi (`*.perinfoan.web.id`) melalui **Docker** dan **Cloudflare Zero Trust Tunnel** di VPS pribadi.

---

## 📂 Struktur Repositori

```text
perinfoan/
├── README.md               # Ringkasan umum repositori (file ini)
├── docs/                   # Dokumentasi arsitektur, domain, dan panduan global
│   ├── CONTEXT.md          # Kamus istilah resmi domain Perinfoan
│   ├── PRODUCT.md          # Konteks produk, audiens, dan prinsip platform
│   └── adr/                # Architecture Decision Records (ADR)
│       └── 0001-decoupled-projects-and-cloudflare-ingress.md
└── projects/               # Direktori seluruh proyek independen
    ├── profile/            # Web Profile utama (perinfoan.web.id) [Astro + Tailwind]
    └── uno-game/           # Contoh proyek game (uno.perinfoan.web.id) [In Development]
```

---

## 🚀 Direktori Proyek (`projects/`)

| Proyek | Subdomain | Tech Stack | Status | Dokumentasi |
|---|---|---|---|---|
| **Web Profile** | [`perinfoan.web.id`](https://perinfoan.web.id) | Astro, Tailwind CSS, Docker | 🟢 Live | [Baca README Proyek](projects/profile/README.md) |
| **UNO Game** | `uno.perinfoan.web.id` | Node.js, WebSockets, Canvas | 🟡 In Development | *(Segera hadir)* |

Setiap proyek memiliki folder terpisah di `projects/<nama-proyek>/` yang dilengkapi dengan `README.md`, `Dockerfile`, dan `docker-compose.yml` sendiri tanpa saling mengganggu proyek lain.

---

## 📖 Dokumentasi Lengkap

Untuk panduan dan detail arsitektur lebih dalam, silakan pelajari dokumen di direktori `docs/`:

- [**Kamus Istilah Domain (`docs/CONTEXT.md`)**](docs/CONTEXT.md): Istilah resmi yang digunakan di seluruh repositori (*Member*, *Project*, *Web Profile*, *Showcase*).
- [**Prinsip & Konteks Produk (`docs/PRODUCT.md`)**](docs/PRODUCT.md): Gambaran platform, audiens (7 anggota tetap), dan batasan teknis.
- [**Catatan Keputusan Arsitektur (`docs/adr/`)**](docs/adr/): Penjelasan alasan pemilihan arsitektur *Decoupled Multi-Project* dan routing Cloudflare Ingress.

---

## 🤝 Kontribusi Anggota (7 Anggota Tetap)

Grup Perinfoan memiliki jumlah anggota tetap sebanyak 7 orang. Setiap anggota dapat memperbarui profil slot masing-masing (`#01` s/d `#07`) atau mendaftarkan proyek baru melalui GitHub Pull Request.

Panduan teknis langkah demi langkah dapat dilihat langsung di [README Web Profile](projects/profile/README.md#2-panduan-kontribusi-untuk-anggota-grup).
