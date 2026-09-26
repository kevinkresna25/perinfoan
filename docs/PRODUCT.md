# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Astro + Tailwind CSS (Static Site Generation / SSG, di-serve dengan Nginx Alpine di dalam Docker)

## Users

1. **Anggota Perinfoan**: Kawan-kawan circle tetap yang menggunakan platform ini untuk memamerkan profil pribadi, menampilkan hasil karya proyek belajar/eksplorasi, dan berlatih kolaborasi git.
2. **Pengunjung Eksternal**: Rekan, rekruter, atau publik yang ingin melihat profil circle, direktori anggota, dan mencoba proyek-proyek yang sudah aktif.

## Product Purpose

Sebagai Web Profile utama dan portal direktori untuk grup Perinfoan, yang menampilkan identitas kelompok, profil seluruh anggota, dan etalase (showcase) seluruh proyek eksperimental yang dibuat.

## Positioning

Portal agregator proyek yang memadukan estetika editorial zine berkelas dengan atmosfer tongkrongan santai, di mana penambahan data dilakukan secara kolaboratif melalui Git Pull Request.

## Operating Context

- Di-host di VPS pribadi menggunakan Docker.
- Terhubung aman melalui Cloudflare Zero Trust Tunnel (`cloudflared`) tanpa ekspos port publik.
- Repositori menampung beragam proyek terpisah di folder `projects/<nama-project>/`.
- Setiap proyek mandiri dapat diakses secara terisolasi.

## Capabilities and Constraints

- **Fixed Circle**: Lingkaran pertemanan tertutup, pembaruan data profil dilakukan pada slot masing-masing.
- **Static Content Collections**: Data profil anggota (`src/content/members/`) dan proyek (`src/content/projects/`) menggunakan file Markdown (`.md`) dengan frontmatter yang divalidasi skema Zod.
- **Ultra-Lightweight Footprint**: Build statis murni yang di-serve Nginx Alpine (~15-20MB RAM) agar VPS hemat resource untuk container proyek lain.
- **Decoupled Lifecycle**: Web Profile tidak bergantung pada backend dinamis apa pun, memastikan ketersediaan tinggi meski proyek lain sedang restart atau diperbarui.

## Brand Commitments

- **Nama**: Perinfoan
- **Tagline**: Bersama Berkarya, Aku Perinfoan, Bersiaplah.
- **Voice**: Santai, cerdas, bersahabat, khas obrolan tongkrongan, dengan integritas teknis yang solid.

## Evidence on Hand

- Data inisial: Profil inisial dan template anggota untuk onboarding Git PR.
- Proyek inisial: Web Profile Perinfoan (Live) dan UNO Game (Live).

## Product Principles

1. **Low Overhead & High Reliability**: Arsitektur statis yang cepat, aman, dan hemat memori VPS.
2. **Community & Git-Driven**: Menjadi sarana edukasi kolaboratif bagi anggota grup melalui workflow Git/GitHub nyata.
3. **Decoupled Modularity**: Web Profile berdiri sendiri dan tidak terkunci dengan stack teknologi proyek lain.
4. **Authentic Editorial Aesthetic**: Desain berkarakter zine indie yang hangat, menolak template generik AI yang dingin.
