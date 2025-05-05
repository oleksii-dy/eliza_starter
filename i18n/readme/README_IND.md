# Eliza 🤖

<div align="center">
  <img src="./docs/static/img/eliza_banner.jpg" alt="Eliza Banner" width="100%" />
</div>

<div align="center">

📑 [Laporan Teknis](https://arxiv.org/pdf/2501.06781) |  📖 [Dokumentasi](https://elizaos.github.io/eliza/) | 🎯 [Contoh](https://github.com/thejoven/awesome-eliza)

</div>

## 🌍 Terjemahan README

[中文说明](i18n/readme/README_CN.md) | [Penjelasan dalam Bahasa Jepang](i18n/readme/README_JA.md) | [Penjelasan dalam Bahasa Korea](i18n/readme/README_KOR.md) | [Bahasa Persia](i18n/readme/README_FA.md) | [Bahasa Prancis](i18n/readme/README_FR.md) | [Bahasa Portugis](i18n/readme/README_PTBR.md) | [Bahasa Turki](i18n/readme/README_TR.md) | [Bahasa Rusia](i18n/readme/README_RU.md) | [Bahasa Spanyol](i18n/readme/README_ES.md) | [Bahasa Italia](i18n/readme/README_IT.md) | [Bahasa Thai](i18n/readme/README_TH.md) | [Bahasa Jerman](i18n/readme/README_DE.md) | [Bahasa Vietnam](i18n/readme/README_VI.md) | [Ibrani](i18n/readme/README_HE.md) | [Tagalog](i18n/readme/README_TG.md) | [Polski](i18n/readme/README_PL.md) | [Arab](i18n/readme/README_AR.md) | [Hungaria](i18n/readme/README_HU.md) | [Serbia](i18n/readme/README_RS.md) | [Rumania](i18n/readme/README_RO.md) | [Belanda](i18n/readme/README_NL.md) | [Yunani](i18n/readme/README_GR.md)

## 🚩 Ringkasan

<div align="center">
  <img src="./docs/static/img/eliza_diagram.png" alt="Diagram Eliza" width="100%" />
</div>

## ✨ Fitur

* 🛠️ Konektor lengkap untuk Discord, X (Twitter), dan Telegram
* 🔗 Mendukung semua model AI (Llama, Grok, OpenAI, Anthropic, Gemini, dll.)
* 👥 Dukungan multi-agen dan ruang
* 📚 Mudah untuk memuat dan berinteraksi dengan dokumen Anda
* 💾 Memori yang dapat diambil kembali dan penyimpanan dokumen
* 🚀 Sangat dapat dikembangkan – buat aksi dan klien Anda sendiri
* 📦 Langsung bisa digunakan!

## Tutorial Video

[AI Agent Dev School](https://www.youtube.com/watch?v=ArptLpQiKfI&list=PLx5pnFXdPTRzWla0RaOxALTSTnVq53fKL)

## 🎯 Kasus Penggunaan

* 🤖 Chatbot
* 🕵️ Agen Otonom
* 📈 Penanganan Proses Bisnis
* 🎮 NPC dalam Video Game
* 🧠 Perdagangan

## 🚀 Memulai Cepat

### Prasyarat

* [Python 2.7+](https://www.python.org/downloads/)
* [Node.js 23+](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm)
* [pnpm](https://pnpm.io/installation)

> **Catatan untuk Pengguna Windows:** Diperlukan [WSL 2](https://learn.microsoft.com/en-us/windows/wsl/install-manual).

### Gunakan Starter (Disarankan untuk membuat Agen)

Langkah lengkap dan dokumentasi dapat ditemukan di [Repositori Eliza Starter](https://github.com/elizaOS/eliza-starter).

```bash
git clone https://github.com/elizaos/eliza-starter.git
cd eliza-starter
cp .env.example .env
pnpm i && pnpm build && pnpm start
```

### Memulai Eliza Secara Manual (Hanya untuk pengembangan plugin atau platform)

#### Ambil rilis terbaru

```bash
git clone https://github.com/elizaos/eliza.git
git checkout $(git describe --tags --abbrev=0)
```

Jika ingin file karakter contoh juga, jalankan:

```bash
git submodule update --init
```

#### Edit file .env

Salin `.env.example` ke `.env` dan isi nilainya.

```
cp .env.example .env
```

Catatan: `.env` opsional. Untuk banyak agen berbeda, rahasia bisa lewat JSON karakter.

#### Jalankan Eliza

```bash
pnpm i
pnpm build
pnpm start
pnpm clean
```

### Berinteraksi melalui Browser

Setelah agen berjalan, jalankan:

```bash
pnpm start:client
```

Lalu buka URL yang ditampilkan dan baca [Dokumentasi](https://elizaos.github.io/eliza/) untuk menyesuaikan Eliza Anda.

---

### Jalankan Eliza secara Otomatis

Gunakan skrip start:

```bash
sh scripts/start.sh
```

Lihat panduan [Start Script](./docs/docs/guides/start-script.md) untuk info lengkap.

---

### Ubah Karakter

1. Buka `packages/core/src/defaultCharacter.ts` untuk ubah karakter default.
2. Untuk karakter khusus:

   * Jalankan `pnpm start --characters="path/ke/karakter.json"`
   * Bisa memuat banyak file karakter
3. Untuk koneksi ke X (Twitter), ubah `"clients": []` jadi `"clients": ["twitter"]`

---

### Tambah Plugin

1. Jalankan `npx elizaos plugins list` atau kunjungi [https://elizaos.github.io/registry/](https://elizaos.github.io/registry/)
2. Jalankan `npx elizaos plugins add @elizaos-plugins/plugin-NAMA`

#### Persyaratan Tambahan

Jika gagal saat startup, coba install Sharp:

```
pnpm install --include=optional sharp
```

---

## Gunakan Plugin Kustom Anda

### Instalasi

1. Upload plugin ke folder `packages/`

2. Tambahkan ke `package.json`:

```json
{
  "dependencies": {
    "@elizaos/plugin-example": "workspace:*"
  }
}
```

3. Import ke `character.json`

```json
"plugins": [
  "@elizaos/plugin-example",
]
```

---

### Jalankan Eliza dengan Gitpod

[![Buka di Gitpod](https://gitpod.io/button/open-in-gitpod.svg)](https://gitpod.io/#https://github.com/elizaos/eliza/tree/main)

---

### Deploy Eliza dalam Satu Klik

Gunakan [Fleek](https://fleek.xyz/eliza/) untuk membangun agen AI Anda:

1. Mulai dari template
2. Bangun file karakter dari awal
3. Unggah file karakter siap pakai

Klik [di sini](https://fleek.xyz/eliza/) untuk mulai!

---

### Komunitas & Kontak

* [GitHub Issues](https://github.com/elizaos/eliza/issues) – untuk bug dan saran fitur
* [elizaOS Discord](https://discord.gg/elizaos) – untuk komunitas teknikal
* [DAO Discord](https://discord.gg/ai16z) – untuk komunitas umum

## Sitasi

Kami memiliki [makalah](https://arxiv.org/pdf/2501.06781) yang bisa Anda kutip:

```bibtex
@article{walters2025eliza,
  title={Eliza: A Web3 friendly AI Agent Operating System},
  author={Walters, Shaw dan Gao, Sam dan Nerd, Shakker dan Da, Feng dan Williams, Warren dan Meng, Ting-Chien dan Han, Hunter dan He, Frank dan Zhang, Allen dan Wu, Ming dan lainnya},
  journal={arXiv preprint arXiv:2501.06781},
  year={2025}
}
```

## Kontributor

<a href="https://github.com/elizaos/eliza/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=elizaos/eliza" alt="Kontributor proyek Eliza" />
</a>

## Riwayat Bintang

[![Grafik Riwayat Bintang](https://api.star-history.com/svg?repos=elizaos/eliza\&type=Date)](https://star-history.com/#elizaos/eliza&Date)

## 🛠️ Persyaratan Sistem

### Minimum

* CPU: Prosesor dual-core
* RAM: 4GB
* Penyimpanan: 1GB ruang kosong
* Koneksi internet: Broadband (1 Mbps+)

### Perangkat Lunak

* Python 2.7+ (disarankan 3.8+)
* Node.js 23+
* pnpm
* Git

### Opsional

* GPU: untuk menjalankan model LLM lokal
* Penyimpanan tambahan: untuk dokumen dan memori
* RAM lebih tinggi: untuk menjalankan banyak agen

## 📁 Struktur Proyek

```
eliza/
├── packages/
│   ├── core/           # Fungsi utama El
```


iza
│   ├── clients/        # Implementasi klien
│   └── actions/        # Aksi khusus
├── docs/              # Dokumentasi
├── scripts/           # Skrip utilitas
└── examples/          # Implementasi contoh

```

## 🤝 Kontribusi

Kami menyambut kontribusi! Berikut caranya:

### Memulai
1. Fork repositori
2. Buat branch baru: `git checkout -b fitur/nama-fitur-anda`
3. Lakukan perubahan
4. Jalankan tes: `pnpm test`
5. Ajukan pull request

### Jenis Kontribusi
- 🐛 Perbaikan bug
- ✨ Fitur baru
- 📚 Peningkatan dokumentasi
- 🌍 Terjemahan
- 🧪 Peningkatan pengujian

### Gaya Kode
- Ikuti gaya kode yang ada
- Tambahkan komentar untuk logika kompleks
- Perbarui dokumentasi
- Tambahkan pengujian untuk fitur baru
