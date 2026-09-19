# Perinfoan

> Bersama Berkarya, Aku Perinfoan, Bersiaplah.  
> Rumah digital dan wadah eksplorasi perangkat lunak lingkaran Perinfoan.

---

## 📌 Sekilas Tentang Perinfoan

**Perinfoan** berawal dari grup diskusi dan tempat nongkrong santai. Di sela-sela rutinitas harian, kami sering berdiskusi tentang teknologi, bermain game bersama, dan membangun berbagai proyek eksperimental yang menyenangkan.

Repositori ini menggunakan arsitektur **Decoupled Multi-Project**, di mana setiap proyek berdiri mandiri di foldernya masing-masing, memiliki runtime/stack sendiri, dan di-deploy melalui **Docker** dan **Cloudflare Zero Trust Tunnel** di VPS pribadi.

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
    ├── profile/            # Web Profile utama [Astro + Tailwind]
    └── uno-game/           # Proyek game UNO [In Development]
```

---

## 🚀 Direktori Proyek (`projects/`)

| Proyek | Kategori | Tech Stack | Status | Dokumentasi |
|---|---|---|---|---|
| **Web Profile** | Portal Utama | Astro, Tailwind CSS, Docker | 🟢 Live | [Baca README Proyek](projects/profile/README.md) |
| **UNO Game** | Multiplayer Game | Node.js, WebSockets, Canvas | 🟡 In Development | *(Segera hadir)* |

Setiap proyek memiliki folder terpisah di `projects/<nama-proyek>/` yang dilengkapi dengan `README.md`, `Dockerfile`, dan `docker-compose.yml` sendiri tanpa saling mengganggu proyek lain.

---

## 📖 Dokumentasi Lengkap

Untuk panduan dan detail arsitektur lebih dalam, silakan pelajari dokumen di direktori `docs/`:

- [**Kamus Istilah Domain (`docs/CONTEXT.md`)**](docs/CONTEXT.md): Istilah resmi yang digunakan di seluruh repositori (*Member*, *Project*, *Web Profile*, *Showcase*).
- [**Prinsip & Konteks Produk (`docs/PRODUCT.md`)**](docs/PRODUCT.md): Gambaran platform, prinsip, dan batasan teknis.
- [**Catatan Keputusan Arsitektur (`docs/adr/`)**](docs/adr/): Penjelasan alasan pemilihan arsitektur *Decoupled Multi-Project* dan routing Cloudflare Ingress.

---

## 🤝 Kontribusi Anggota

Setiap anggota dapat memperbarui kartu profil masing-masing atau mendaftarkan proyek baru melalui GitHub Pull Request.

Panduan teknis langkah demi langkah dapat dilihat langsung di [README Web Profile](projects/profile/README.md#2-panduan-kontribusi-untuk-anggota-grup).
