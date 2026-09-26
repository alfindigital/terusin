#!/usr/bin/env node
/* Cek cepat tanpa dependency: semua aset yang direferensikan benar ada di
   disk, daftar putih build-dist tidak ketinggalan file publik, dan versi
   ?v= di index.html cocok dengan yang di-pre-cache sw.js.
   Jalankan: node tools/cek.js */
const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const ROOT = path.join(__dirname, '..');
let gagal = 0;

function ok(cond, pesan) {
  if (cond) { console.log('OK   ' + pesan); }
  else { gagal++; console.log('GAGAL ' + pesan); }
}

function ada(rel) { return fs.existsSync(path.join(ROOT, rel)); }
function baca(rel) { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); }
/* 'css/style.css?v=3' -> 'css/style.css' */
function polos(rel) { return rel.replace(/[?#].*$/, '').replace(/^\.\//, ''); }

/* Ambil string-string dari literal array JS: var X = ['a', 'b']; */
function ambilArray(src, nama) {
  const m = src.match(new RegExp('(?:var|const|let)\\s+' + nama + '\\s*=\\s*\\[([\\s\\S]*?)\\]'));
  if (!m) return null;
  return [...m[1].matchAll(/'([^']*)'/g)].map(x => x[1]);
}

/* 1. Sintaks semua JS valid (node --check, tetap nol dependency). */
for (const f of ['js/core.js', 'js/app.js', 'sw.js', 'tools/build-dist.js', 'tools/make-icons.js', 'tools/cek.js', 'tools/tes.js']) {
  let valid = true;
  try { cp.execFileSync(process.execPath, ['--check', path.join(ROOT, f)], { stdio: 'pipe' }); }
  catch (e) { valid = false; }
  ok(valid, 'sintaks valid: ' + f);
}

/* 2. Referensi lokal di index.html (src/href) ada di disk. */
const html = baca('index.html');
const refs = [...html.matchAll(/(?:src|href)="([^"]+)"/g)]
  .map(x => x[1])
  .filter(u => !/^(https?:|mailto:|#|data:)/.test(u));
for (const r of refs) {
  ok(ada(polos(r)), 'index.html -> ' + r);
}

/* 3. manifest.webmanifest valid JSON dan ikonnya ada. */
let manifest = null;
try { manifest = JSON.parse(baca('manifest.webmanifest')); } catch (e) {}
ok(!!manifest, 'manifest.webmanifest adalah JSON valid');
if (manifest) {
  for (const ic of manifest.icons || []) {
    ok(ada(polos(ic.src)), 'manifest icon -> ' + ic.src);
  }
}

/* 4. SHELL di sw.js ada di disk, dan ?v= cocok dengan yang dipakai index.html. */
const sw = baca('sw.js');
const shell = ambilArray(sw, 'SHELL');
ok(!!shell, 'sw.js punya daftar SHELL');
if (shell) {
  for (const u of shell) {
    if (polos(u) === '' || u === './') { ok(ada('index.html'), 'sw SHELL -> ./'); continue; }
    ok(ada(polos(u)), 'sw SHELL -> ' + u);
    const q = u.match(/\?v=\w+/);
    if (q) ok(html.includes('"' + polos(u) + q[0] + '"'), 'versi ' + q[0] + ' di index.html cocok untuk ' + polos(u));
  }
}

/* 5. Daftar putih build-dist: semua entri ada, dan tidak ada aset publik yang
   dibutuhkan app tapi luput dari daftar (arah gagal yang salah = bocor .md,
   arah gagal yang benar = lupa daftar -> ketahuan di sini). */
const bd = baca('tools/build-dist.js');
const allow = ambilArray(bd, 'ALLOW');
ok(!!allow, 'build-dist.js punya daftar ALLOW');
if (allow) {
  for (const rel of allow) ok(ada(rel), 'ALLOW ada di disk: ' + rel);
  const perlu = new Set(['index.html', 'manifest.webmanifest', 'sw.js', '_headers']);
  refs.forEach(r => perlu.add(polos(r)));
  (shell || []).forEach(u => { if (u !== './' && polos(u)) perlu.add(polos(u)); });
  (manifest && manifest.icons || []).forEach(ic => perlu.add(polos(ic.src)));
  for (const rel of perlu) {
    ok(allow.includes(rel), 'ALLOW mencakup aset publik: ' + rel);
  }
}

console.log(gagal ? `\n${gagal} cek gagal` : '\nSemua cek lulus');
process.exitCode = gagal ? 1 : 0;
