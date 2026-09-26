/* Terusin core — fungsi murni: tanggal, hitungan streak, sanitasi data.
   Tanpa DOM, tanpa state global: semua bisa dites langsung di node lewat
   tools/tes.js. Di browser dipasang sebagai window.TerusinCore. */
(function (root, pabrik) {
  var api = pabrik();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TerusinCore = api;
})(typeof self !== 'undefined' ? self : this, function () {
'use strict';

var WARNA = [
  { id: 'kunyit', gelap: '#E8A33D', terang: '#9A5E02' },
  { id: 'daun',   gelap: '#7CC257', terang: '#3D7519' },
  { id: 'nila',   gelap: '#6E9CF5', terang: '#1F5BC4' },
  { id: 'mengkudu', gelap: '#F2705B', terang: '#C2331A' },
  { id: 'pandan', gelap: '#42C8A8', terang: '#0A7860' },
  { id: 'terung', gelap: '#B98CF0', terang: '#7136C4' },
  { id: 'soga',   gelap: '#C99A6A', terang: '#8A5A22' },
  { id: 'jambu',  gelap: '#EE7FB0', terang: '#B62C68' }
];

var HARI_P = ['Sn', 'Sl', 'Rb', 'Km', 'Jm', 'Sb', 'Mg'];
var HARI_L = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
var BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
             'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

/* ── tanggal: semua pakai kunci 'YYYY-MM-DD' lokal, jangan toISOString
   karena itu UTC dan bikin geser sehari di WIB ── */
function kunciTgl(d) {
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0');
}
function keTgl(k) {
  var p = k.split('-');
  return new Date(+p[0], +p[1] - 1, +p[2], 12);   // jam 12 supaya aman DST
}
function geser(k, n) {
  var d = keTgl(k);
  d.setDate(d.getDate() + n);
  return kunciTgl(d);
}
function jarak(a, b) {
  return Math.round((keTgl(b) - keTgl(a)) / 86400000);
}
function kini() { return kunciTgl(new Date()); }
/* Senin = 0 */
function hariKe(k) { return (keTgl(k).getDay() + 6) % 7; }

/* Selamatkan sebanyak mungkin. Entri yang cuma kehilangan log atau warna masih
   bisa dipakai, jadi jangan dibuang: buat app kebiasaan, membuang satu entri
   berarti membuang riwayat berbulan bulan. Yang dibuang cuma yang benar benar
   bukan kebiasaan (bukan objek, atau tanpa nama sama sekali). */
function pulihkan(arr) {
  var keluar = [], id = {};
  for (var i = 0; i < arr.length; i++) {
    var h = arr[i];
    if (!h || typeof h !== 'object') continue;
    var nama = typeof h.nama === 'string' ? h.nama.trim() : '';
    if (!nama) continue;

    var log = {};
    if (h.log && typeof h.log === 'object' && !Array.isArray(h.log)) {
      for (var k in h.log) {
        if (/^\d{4}-\d{2}-\d{2}$/.test(k) && h.log[k]) log[k] = 1;
      }
    }
    var hid = typeof h.id === 'string' && h.id && !id[h.id]
      ? h.id
      : 'h' + Date.now().toString(36) + i.toString(36);
    id[hid] = 1;

    var w = WARNA[0].id;
    for (var j = 0; j < WARNA.length; j++) if (WARNA[j].id === h.warna) w = h.warna;

    keluar.push({
      id: hid,
      nama: nama.slice(0, 48),
      warna: w,
      setelah: typeof h.setelah === 'string' ? h.setelah : null,
      arsip: !!h.arsip,
      mulai: /^\d{4}-\d{2}-\d{2}$/.test(h.mulai) ? h.mulai : (Object.keys(log).sort()[0] || kini()),
      /* pengingat per habit: jam 'HH:MM' ketat, dan tanggal notif terakhir
         biar dedup sekali-sehari tetap hidup setelah reload */ 
      ingat: /^([01]\d|2[0-3]):[0-5]\d$/.test(h.ingat || '') ? h.ingat : null,
      ingatTerakhir: /^\d{4}-\d{2}-\d{2}$/.test(h.ingatTerakhir || '') ? h.ingatTerakhir : null,
      log: log
    });
  }
  /* buang rujukan setelah yang menunjuk hantu atau muter, supaya rantai selalu sehat */
  var ada = {};
  keluar.forEach(function (h) { ada[h.id] = h; });
  keluar.forEach(function (h) {
    if (!h.setelah) return;
    if (!ada[h.setelah]) { h.setelah = null; return; }
    var lihat = {}, j = h.setelah;
    while (j) {
      if (j === h.id || lihat[j]) { h.setelah = null; break; }
      lihat[j] = 1;
      j = ada[j] ? ada[j].setelah : null;
    }
  });
  return keluar;
}

function beres(h, k) { return !!h.log[k]; }

/* Runtun dihitung dari hari ini ke belakang. Hari ini yang belum ditandai
   TIDAK memutus runtun, karena harinya belum habis. */
function runtun(h) {
  var k = kini(), n = 0;
  if (!beres(h, k)) k = geser(k, -1);
  while (beres(h, k)) { n++; k = geser(k, -1); }
  return n;
}
function rekor(h) {
  var ks = Object.keys(h.log).sort();
  var best = 0, run = 0, prev = null;
  for (var i = 0; i < ks.length; i++) {
    run = (prev && jarak(prev, ks[i]) === 1) ? run + 1 : 1;
    if (run > best) best = run;
    prev = ks[i];
  }
  return best;
}
function total(h) { return Object.keys(h.log).length; }

/* Statistik satu kebiasaan: total, runtun, rekor, persen beres dalam jendela
   30 hari (dihitung sejak `mulai`, bukan 30 hari penuh, supaya habit baru
   nggak kelihatan jeblok), plus hari-dalam-pekan yang paling sering bolong
   — rasio isi/peluang per Senin..Minggu. Itu yang menjawab "kenapa selalu
   gagal di hari X". Semua dari data lokal, nol request. */
function statistik(h) {
  var k = kini();
  var awal = /^\d{4}-\d{2}-\d{2}$/.test(h.mulai || '') && jarak(h.mulai, k) >= 0
    ? h.mulai : k;
  var umur = Math.min(jarak(awal, k) + 1, 366);   // cap setahun: cukup buat pola pekanan

  var jendela = Math.min(30, umur);
  var isi30 = 0;
  for (var i = 0; i < jendela; i++) if (beres(h, geser(k, -i))) isi30++;

  var peluang = [0, 0, 0, 0, 0, 0, 0], isi = [0, 0, 0, 0, 0, 0, 0];
  for (var d = 0; d < umur; d++) {
    var t = geser(k, -d), hd = hariKe(t);
    peluang[hd]++;
    if (beres(h, t)) isi[hd]++;
  }
  var lemah = -1, rasio = 2;
  for (var j = 0; j < 7; j++) {
    var r = isi[j] / peluang[j];
    if (r < rasio) { rasio = r; lemah = j; }
  }
  return {
    total: total(h), runtun: runtun(h), rekor: rekor(h),
    umur: umur, pct30: Math.round(isi30 / jendela * 100),
    hariLemah: lemah,
    lemahIsi: lemah < 0 ? 0 : isi[lemah],
    lemahPeluang: lemah < 0 ? 0 : peluang[lemah]
  };
}

/* Apakah menempelkan habit `id` setelah `calonPemicu` bikin rantai muter.
   `semua` = array habit (disuplai caller, bukan global). */
function muter(semua, id, calonPemicu) {
  var lihat = {}, j = calonPemicu;
  while (j) {
    if (j === id) return true;
    if (lihat[j]) return true;
    lihat[j] = 1;
    var n = null;
    for (var i = 0; i < semua.length; i++) if (semua[i].id === j) n = semua[i];
    j = n ? n.setelah : null;
  }
  return false;
}

return {
  WARNA: WARNA, HARI_P: HARI_P, HARI_L: HARI_L, BULAN: BULAN,
  kunciTgl: kunciTgl, keTgl: keTgl, geser: geser, jarak: jarak,
  kini: kini, hariKe: hariKe,
  pulihkan: pulihkan, beres: beres, runtun: runtun, rekor: rekor,
  total: total, muter: muter, statistik: statistik
};
});
