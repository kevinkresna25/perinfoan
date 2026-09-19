# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Astro + Tailwind CSS (Static Site Generation / SSG, di-serve dengan Nginx Alpine di dalam Docker)

## Users

1. **Anggota Perinfoan**: 7 orang mahasiswa circle tetap kampus yang menggunakan platform ini untuk memamerkan profil pribadi, menampilkan hasil karya proyek iseng/belajar, dan berlatih kolaborasi git.
2. **Pengunjung Eksternal**: Teman kampus, dosen, rekruter, atau publik yang ingin melihat profil circle, direktori anggota, dan mencoba proyek-proyek yang sudah live di subdomain.

## Product Purpose

Sebagai Web Profile utama dan portal direktori untuk grup Perinfoan di `perinfoan.web.id`, yang menampilkan identitas kelompok, profil seluruh anggota, dan etalase (showcase) seluruh proyek eksperimental yang dibuat.

## Positioning

Portal agregator proyek kampus yang memadukan UI tech-savvy modern berkelas dengan atmosfer tongkrongan santai, di mana penambahan data dilakukan secara kolaboratif melalui Git Pull Request.

## Operating Context

- Di-host di VPS pribadi menggunakan Docker.
- Terhubung aman ke domain `perinfoan.web.id` melalui Cloudflare Zero Trust Tunnel (`cloudflared`) tanpa ekspos port publik.
- Repositori menampung beragam proyek terpisah di folder `projects/<nama-project>/`.
- Proyek-proyek mandiri diarahkan ke subdomain masing-masing (`*.perinfoan.web.id`).

## Capabilities and Constraints

- **Fixed 7 Members**: Lingkaran pertemanan tertutup berisi tepat 7 orang anggota, tidak menerima penambahan anggota baru; kontribusi profil berupa pembaruan data pada slot `#01` s/d `#07`.
- **Static Content Collections**: Data profil anggota (`src/content/members/`) dan proyek (`src/content/projects/`) menggunakan file Markdown (`.md`) dengan frontmatter yang divalidasi skema Zod.
- **Ultra-Lightweight Footprint**: Build statis murni yang di-serve Nginx Alpine (~15-20MB RAM) agar VPS hemat resource untuk container proyek lain.
- **Decoupled Lifecycle**: Web Profile tidak bergantung pada backend dinamis apa pun, memastikan ketersediaan 99.9% meski proyek subdomain lain sedang restart atau error.

## Brand Commitments

- **Nama**: Perinfoan
- **Domain**: `https://perinfoan.web.id/`
- **Voice**: Santai, cerdas, bersahabat, khas obrolan kampus, namun tetap memiliki integritas teknis yang solid.

## Evidence on Hand

- Domain resmi: `perinfoan.web.id`.
- Data inisial: 1 profil lengkap (Kevin) + 6 template anggota awal untuk onboarding Git PR.
- Proyek inisial: Web Profile Perinfoan (Live) dan UNO Game (In Development).

## Product Principles

1. **Low Overhead & High Reliability**: Arsitektur statis yang cepat, aman, dan hemat memori VPS.
2. **Community & Git-Driven**: Menjadi sarana edukasi kolaboratif bagi anggota grup melalui workflow Git/GitHub nyata.
3. **Decoupled Modularity**: Web Profile berdiri sendiri dan tidak terkunci dengan stack teknologi proyek-proyek di subdomain.
4. **Hybrid Aesthetic**: Eksterior modern & sleek, namun interior copywriting tetap hangat dan bersahabat.
