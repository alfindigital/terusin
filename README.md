# Terusin

**Pencatat kebiasaan yang benang harinya nyambung.** Hari-hari yang beruntun menyatu jadi satu batang utuh, bukan grid kotak-kotak terpisah. Streak kebaca dari bentuk, bukan dari angka.

**Coba langsung: [terusin.pages.dev](https://terusin.pages.dev)**

Buka di HP, lalu "Add to Home Screen". Jalan offline penuh setelah kunjungan pertama.

---

## Kenapa ini ada

Habit tracker populer seperti HabitKit sebenarnya sudah punya arsip, drag-drop, dan edit. Masalahnya bukan fiturnya tidak ada, tapi **fiturnya dikubur di layar lain**. Terusin menaruh semuanya di tempat kamu sedang berada.

Yang benar-benar tidak ada di kompetitor: **habit stacking** (susun kebiasaan jadi rutinitas berurutan).

## Yang bikin beda

- **Batang menyatu, bukan grid.** 5 hari beruntun dan 5 hari acak langsung kelihatan beda dari bentuknya.
- **Satu ketikan.** Tulis nama, tekan Enter. Tanpa wizard, tanpa wajib pilih kategori atau ikon.
- **Tandai hari mana saja**, bukan cuma hari ini. Lupa nyatet 3 hari lalu tetap bisa.
- **Offline penuh.** Service worker cache semua aset. Cabut internet, tetap jalan.
- **Data cuma di HP kamu.** localStorage. Tanpa akun, tanpa server, tanpa analytics, tanpa tracker.
- **Ekspor/impor JSON.** Datamu bisa kamu bawa pergi.
- **Nol dependency.** Vanilla HTML/CSS/JS. Nol build step untuk development.

## Desain

Sengaja tidak terlihat seperti template generator:

- Font **Archivo** + **Martian Mono**, bukan Inter
- Warna dari nama pewarna alam Indonesia: kunyit, nila, mengkudu, soga
- Sudut tajam, tanpa gradien ungu, tanpa ring progress lingkaran, tanpa emoji sebagai ikon
- Tema gelap dan terang, bisa ikut sistem

## Aksesibilitas

- Kontras WCAG diuji **16/16 lulus** (8 warna x 2 tema), terendah 5.19:1
- Navigasi keyboard penuh, skip link, focus ring terlihat
- `aria-label` dan `role` di semua kontrol interaktif
- Hormat `prefers-reduced-motion`
- Nol scroll horizontal di layar 360px

## Jalankan di lokal

Tidak ada dependency dan tidak ada build step. Cukup server statis apa saja:

```bash
git clone https://github.com/alfindigital/terusin.git
cd terusin
python -m http.server 4820
```

Buka `http://localhost:4820`.

> Service worker butuh `localhost` atau HTTPS. Membuka `index.html` langsung lewat `file://` bikin PWA dan offline tidak aktif.

## Struktur

```
index.html              satu halaman
css/style.css           semua gaya
js/app.js               semua logika
sw.js                   service worker (offline)
manifest.webmanifest    metadata PWA
_headers                header keamanan Cloudflare Pages
icons/                  ikon PWA + maskable
tools/build-dist.js     rakit dist/ pakai daftar putih
tools/make-icons.js     regenerasi ikon
```

## Deploy

`tools/build-dist.js` merakit `dist/` memakai **daftar putih**, bukan daftar hitam. Hanya file yang disebut eksplisit yang ikut, jadi dokumen internal tidak mungkin bocor.

```bash
node tools/build-dist.js
npx wrangler pages deploy dist --project-name terusin
```

Karena statis, jalan juga di Netlify, Vercel, atau GitHub Pages.

## Privasi

Nol pengumpulan data. Tanpa akun, tanpa server, tanpa cookie, tanpa analytics. Satu-satunya permintaan keluar adalah Google Fonts saat kunjungan pertama, setelah itu font ikut ter-cache dan dipakai offline.

## Kontribusi

Issue dan pull request diterima. Tetap pegang prinsipnya: **nol dependency, offline dulu, data milik pemakai.**

## Lisensi

[MIT](LICENSE) — pakai, ubah, jual, silakan.

Dibuat oleh [@alfindigital](https://instagram.com/alfindigital).
