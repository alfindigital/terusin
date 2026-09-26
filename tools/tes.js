#!/usr/bin/env node
/* Test logic fungsi murni di js/core.js — nol dependency, cuma assert bawaan.
   Ini yang diuji cek.js TIDAK bisa: matematika streak, sanitasi impor,
   rantai "setelah" yang muter. Jalankan: node tools/tes.js */
const assert = require('assert');
const C = require('../js/core.js');

let gagal = 0, lulus = 0;
function tes(nama, fn) {
  try { fn(); lulus++; console.log('OK   ' + nama); }
  catch (e) { gagal++; console.log('GAGAL ' + nama + ' — ' + e.message); }
}
function habitKosong(log) {
  return { id: 'h1', nama: 'x', warna: 'kunyit', setelah: null, arsip: false, mulai: '2026-01-01', log: log || {} };
}
/* log N hari ke belakang mulai `dari` (0 = hari ini), berurutan */
function logBerurut(dari, n) {
  const log = {};
  for (let i = 0; i < n; i++) log[C.geser(C.kini(), -(dari + i))] = 1;
  return log;
}

/* ── tanggal ── */
tes('geser melewati batas bulan', () => {
  assert.strictEqual(C.geser('2026-01-31', 1), '2026-02-01');
  assert.strictEqual(C.geser('2026-03-01', -1), '2026-02-28');   // 2026 bukan kabisat
  assert.strictEqual(C.geser('2024-02-28', 1), '2024-02-29');   // 2024 kabisat
  assert.strictEqual(C.geser('2026-12-31', 1), '2027-01-01');
});
tes('kunciTgl/keTgl roundtrip', () => {
  assert.strictEqual(C.kunciTgl(C.keTgl('2026-09-26')), '2026-09-26');
});
tes('jarak menghitung selisih hari', () => {
  assert.strictEqual(C.jarak('2026-09-20', '2026-09-26'), 6);
  assert.strictEqual(C.jarak('2026-09-26', '2026-09-20'), -6);
});
tes('hariKe: Senin=0, 26 Sep 2026 itu Sabtu=5', () => {
  assert.strictEqual(C.hariKe('2026-09-26'), 5);
  assert.strictEqual(C.hariKe('2026-09-21'), 0);   // Senin
});

/* ── streak ── */
tes('runtun: hari ini + 2 hari ke belakang = 3', () => {
  assert.strictEqual(C.runtun(habitKosong(logBerurut(0, 3))), 3);
});
tes('runtun: hari ini kosong tidak memutus kemarin', () => {
  assert.strictEqual(C.runtun(habitKosong(logBerurut(1, 2))), 2);
});
tes('runtun: bolong kemarin = 0 walau 10 hari lalu beruntun', () => {
  assert.strictEqual(C.runtun(habitKosong(logBerurut(2, 10))), 0);
});
tes('rekor: runtun terpanjang sepanjang masa, bukan yang sekarang', () => {
  const log = Object.assign({}, logBerurut(10, 5), logBerurut(0, 2));
  assert.strictEqual(C.rekor(habitKosong(log)), 5);   // yang 5 > yang 2 sekarang
});
tes('beres/total', () => {
  const h = habitKosong(logBerurut(0, 3));
  assert.strictEqual(C.total(h), 3);
  assert.strictEqual(C.beres(h, C.kini()), true);
  assert.strictEqual(C.beres(h, C.geser(C.kini(), -7)), false);
});

/* ── muter (rantai stacking) ── */
tes('muter menolak siklus langsung dan transitif', () => {
  const semua = [
    { id: 'a', setelah: null }, { id: 'b', setelah: 'a' }, { id: 'c', setelah: 'b' }
  ];
  assert.strictEqual(C.muter(semua, 'a', 'c'), true);    // a <- b <- c, pasang a.setelah=c = muter
  assert.strictEqual(C.muter(semua, 'c', 'a'), false);   // c.setelah=a = rantai sehat
  assert.strictEqual(C.muter(semua, 'a', 'a'), true);    // diri sendiri
  assert.strictEqual(C.muter(semua, 'c', 'hantu'), false); // pemicu tak dikenal bukan siklus
});

/* ── pulihkan (permukaan serang impor) ── */
tes('pulihkan membuang entri non-objek dan tanpa nama', () => {
  const out = C.pulihkan([null, 'teks', 42, {}, { nama: '   ' }, { nama: 'Jalan' }]);
  assert.strictEqual(out.length, 1);
  assert.strictEqual(out[0].nama, 'Jalan');
});
tes('pulihkan memotong nama >48 dan trim', () => {
  const out = C.pulihkan([{ nama: '  ' + 'x'.repeat(60) + '  ' }]);
  assert.strictEqual(out[0].nama.length, 48);
});
tes('pulihkan menetralkan warna jahat (mis. javascript:...)', () => {
  const out = C.pulihkan([{ nama: 'a', warna: 'javascript:alert(1)' }, { nama: 'b', warna: 'nila' }]);
  assert.strictEqual(out[0].warna, 'kunyit');
  assert.strictEqual(out[1].warna, 'nila');
});
tes('pulihkan memfilter kunci log bukan YYYY-MM-DD dan nilai falsy', () => {
  const out = C.pulihkan([{
    nama: 'a',
    log: { '2026-09-01': 1, 'bukan-tgl': 1, '<img>': 1, '2026-09-02': 0 }
  }]);
  assert.deepStrictEqual(Object.keys(out[0].log), ['2026-09-01']);
});
tes('pulihkan memutus setelah yang menunjuk hantu atau muter', () => {
  const out = C.pulihkan([
    { id: 'a', nama: 'A', setelah: 'hantu' },
    { id: 'b', nama: 'B', setelah: 'c' },
    { id: 'c', nama: 'C', setelah: 'b' }    // b<->c muter
  ]);
  assert.strictEqual(out[0].setelah, null);
  /* siklus diputus minimal: satu sisi dinullkan, sisi lain jadi rantai sehat.
     Yang penting: graf hasil akhir tidak boleh ada siklus. */
  const ada = {}; out.forEach(h => ada[h.id] = h.setelah);
  out.forEach(h => {
    const lihat = {}; let j = h.setelah;
    while (j) {
      assert.ok(!lihat[j] && j !== h.id, 'masih ada siklus di ' + h.id);
      lihat[j] = 1; j = ada[j] || null;
    }
  });
});
tes('pulihkan mempertahankan rantai stacking yang sehat', () => {
  const out = C.pulihkan([
    { id: 'a', nama: 'A', setelah: null },
    { id: 'b', nama: 'B', setelah: 'a' },
    { id: 'c', nama: 'C', setelah: 'b' }
  ]);
  assert.strictEqual(out[1].setelah, 'a');
  assert.strictEqual(out[2].setelah, 'b');
});
tes('pulihkan memberi id baru untuk id kembar dan arsip dikoersi boolean', () => {
  const out = C.pulihkan([{ id: 'sama', nama: 'A', arsip: 1 }, { id: 'sama', nama: 'B' }]);
  assert.strictEqual(out[0].id, 'sama');
  assert.notStrictEqual(out[1].id, 'sama');
  assert.strictEqual(out[0].arsip, true);
});
tes('pulihkan: mulai = log paling awal, kalau kosong = hari ini', () => {
  const out = C.pulihkan([
    { nama: 'lama', log: { '2026-03-05': 1, '2026-01-02': 1 } },
    { nama: 'baru' }
  ]);
  assert.strictEqual(out[0].mulai, '2026-01-02');
  assert.strictEqual(out[1].mulai, C.kini());
});

console.log(`\n${lulus} tes lulus, ${gagal} gagal`);
process.exitCode = gagal ? 1 : 0;
