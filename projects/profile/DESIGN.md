# Design System — Perinfoan Web Profile

## Aesthetic World: Student Zine & Terminal Telemetry Hybrid
Perinfoan menolak template kartu SaaS generik yang membosankan. Desain ini menggabungkan struktur grid modern yang bersih (*indie zine*) dengan indikator telemetri teknis khas terminal lab komputer (*phosphor cyan & emerald*), menjaga keseimbangan antara estetika profesional dan kehangatan lingkaran tongkrongan kampus.

## Color Palette
- **Background Ground**: `#090a0f` (Deep obsidian slate)
- **Surface Cards**: `#0c0f17` (Normal), `#0c101c` (Featured), `#090d15` (Dashed / Idea slot)
- **Borders**: `#1c2333` (Subtle default), `#2e3852` (Hover/Focused), `#1e2e4a` (Accent borders)
- **Accents**:
  - Phosphor Cyan: `#00f0ff` (Primary actions, key identifiers, selection)
  - Emerald Live: `#10b981` (Online telemetry, live status badge)
  - Amber In-Dev: `#f59e0b` (Work in progress / development state)
- **Text & Contrast**:
  - Primary: `#f3f4f6` (High contrast >= 14:1 against ground)
  - Secondary: `#9ca3af` (Body text, contrast >= 5.5:1)
  - Tertiary / Muted: `#6b7280` (Labels & captions)

## Typography
- **Primary Interface & Headings**: `Schibsted Grotesk` (Sans-serif neo-grotesque yang tajam dan modern)
- **Data, Telemetry, Badges & Code**: `JetBrains Mono` (Monospace dengan karakter teknis kuat)

## Key Components
1. **Telemetry Status Pill**: Komponen header dan hero yang menampilkan status ingress Cloudflare dan kondisi sistem dengan animasi titik pulsa.
2. **Asymmetric Bento Showcase**: Kartu proyek dengan status live ping, tag teknologi terisolasi, nama kontributor, dan tautan langsung ke subdomain.
3. **Collaborative Member Cards**: Kartu profil yang menampilkan avatar, peran, keahlian, dan tautan profil sosial media anggota dengan penomoran `#01` s/d `#07`.
4. **Git-First Onboarding Box**: Panduan 3 langkah visual bagi anggota untuk belajar berkontribusi melalui GitHub Pull Request.
