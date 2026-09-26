#!/usr/bin/env node
/* Bikin folder dist/ yang isinya HANYA aset publik, lalu deploy dari situ.
 *
 * Kenapa repot: `wrangler pages deploy .` mengunggah SEMUA file di folder,
 * termasuk HANDOFF.md dan AGENTS.md yang isinya path lokal PC, hitungan biaya,
 * dan alasan bisnis. Itu pernah kejadian sungguhan 1 Agu 2026 di project
 * Fokusin, dokumennya sempat bisa diakses publik.
 *
 * `.assetsignore` TIDAK menolong: itu fitur Workers Assets, bukan Pages.
 * Sudah dites, dokumen tetap kena unggah.
 *
 * Jalankan: node tools/build-dist.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');

/* Daftar PUTIH, bukan daftar hitam. Kalau ada file baru dan lupa didaftarkan,
   dia tidak tayang. Itu arah gagal yang benar: lupa berarti tidak bocor. */
const ALLOW = [
  'index.html',
  'manifest.webmanifest',
  'sw.js',
  '_headers',
  'css/style.css',
  'js/core.js',
  'js/app.js',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/maskable-192.png',
  'icons/maskable-512.png',
  'icons/apple-touch-icon.png',
  'icons/favicon-32.png',
];

fs.rmSync(DIST, { recursive: true, force: true });

let n = 0;
for (const rel of ALLOW) {
  const src = path.join(ROOT, rel);
  if (!fs.existsSync(src)) {
    console.error(`HILANG: ${rel}`);
    process.exitCode = 1;
    continue;
  }
  const dst = path.join(DIST, rel);
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(src, dst);
  n++;
}

/* Pagar terakhir: pastikan tidak ada .md atau folder tools yang nyelip. */
const bocor = [];
(function walk(dir, base = '') {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = base ? `${base}/${e.name}` : e.name;
    if (e.isDirectory()) walk(path.join(dir, e.name), rel);
    else if (/\.md$/i.test(rel) || rel.startsWith('tools/')) bocor.push(rel);
  }
})(DIST);

if (bocor.length) {
  console.error('BOCOR ke dist:', bocor);
  process.exitCode = 1;
} else {
  console.log(`dist/ siap: ${n} file, nol dokumen internal`);
  console.log('deploy: npx wrangler pages deploy dist --project-name terusin --branch main --commit-dirty=true');
}
