---
title: "Perinfoan Web Profile"
description: "Pusat komando dan portal direktori resmi circle Perinfoan, menampung seluruh profil anggota dan etalase proyek subdomain."
status: "live"
subdomain: "perinfoan.web.id"
url: "https://perinfoan.web.id"
techStack:
  - "Astro"
  - "Tailwind CSS"
  - "Docker"
  - "Cloudflare"
contributors:
  - "Kevin Kresnayana"
category: "Core Portal"
order: 1
---

Web Profile utama yang dibangun dengan arsitektur Static Site Generation (SSG) super ringan di atas Astro, di-serve menggunakan container Nginx Alpine di VPS, dan diamankan menggunakan Cloudflare Zero Trust Tunnel. Seluruh konten anggota dikelola secara desentralisasi melalui file Markdown dan Git Pull Request.
