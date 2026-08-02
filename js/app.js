/* Terusin — pencatat kebiasaan. Satu IIFE, nol global, nol dependency. */
(function () {
'use strict';

var KUNCI = 'terusin.v1';
var VERSI = '1.0.0';

/* Warna: nama semantik disimpan, hex-nya ikut tema. Kalau hex yang disimpan,
   warna yang bagus di gelap jadi jelek di terang. */
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

/* ── state ── */
var S = { habit: [], tema: 'gelap' };
var buka = {};        // id -> menu kartu kebuka
var luas = {};        // id -> berapa pekan tambahan dibuka manual
var pekan = 5;        // batas pekan otomatis, ikut lebar layar
var undo = null;      // { data, timer }

function muat() {
  try {
    var raw = localStorage.getItem(KUNCI);
    if (!raw) return;
    var d = JSON.parse(raw);
    if (d && Array.isArray(d.habit)) S.habit = pulihkan(d.habit);
    if (d && typeof d.tema === 'string') S.tema = d.tema;
  } catch (e) { /* data rusak total, mulai bersih */ }
}

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
function simpan() {
  try { localStorage.setItem(KUNCI, JSON.stringify({ v: 1, habit: S.habit, tema: S.tema })); }
  catch (e) { pesan('Penyimpanan penuh, perubahan terakhir nggak ikut tersimpan'); }
}

/* ── hitungan ── */
function aktif() { return S.habit.filter(function (h) { return !h.arsip; }); }
function warnaHex(h) {
  var w = null;
  for (var i = 0; i < WARNA.length; i++) if (WARNA[i].id === h.warna) w = WARNA[i];
  if (!w) w = WARNA[0];
  return S.tema === 'terang' ? w.terang : w.gelap;
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

/* Susunan: habit boleh "nempel" ke habit lain (stacking). Pemicunya harus
   habit lain yang aktif, dan rantainya nggak boleh muter. */
function pemicu(h) {
  if (!h.setelah) return null;
  for (var i = 0; i < S.habit.length; i++) {
    if (S.habit[i].id === h.setelah && !S.habit[i].arsip) return S.habit[i];
  }
  return null;   // pemicunya sudah diarsip atau dihapus, anggap lepas
}
function muter(id, calonPemicu) {
  var lihat = {}, j = calonPemicu;
  while (j) {
    if (j === id) return true;
    if (lihat[j]) return true;
    lihat[j] = 1;
    var n = null;
    for (var i = 0; i < S.habit.length; i++) if (S.habit[i].id === j) n = S.habit[i];
    j = n ? n.setelah : null;
  }
  return false;
}
/* giliran: pemicunya sudah beres hari ini, tapi ini belum. inilah yang harus
   dikerjakan sekarang. */
function giliran(h) {
  var p = pemicu(h);
  return !!p && beres(p, kini()) && !beres(h, kini());
}

/* ── DOM ── */
var $ = function (s) { return document.querySelector(s); };
var el = {
  tgl: $('#tgl'), judul: $('#judul'), sub: $('#sub'),
  daftar: $('#daftar'), galat: $('#galat'),
  fTambah: $('#fTambah'), iNama: $('#iNama'),
  arsipBlok: $('#arsipBlok'), arsipIsi: $('#arsipIsi'),
  bArsip: $('#bArsip'), arsipHitung: $('#arsipHitung'),
  rekap: $('#rekap'), sheet: $('#sheet'), toast: $('#toast'),
  toastT: $('#toastT'), toastB: $('#toastB'), tpl: $('#tplKartu')
};

function pesan(t, aksi) {
  el.toastT.textContent = t;
  if (aksi) {
    el.toastB.hidden = false;
    el.toastB.textContent = aksi.label;
    el.toastB.onclick = function () { aksi.jalan(); el.toast.hidden = true; };
  } else {
    el.toastB.hidden = true;
    el.toastB.onclick = null;
  }
  el.toast.hidden = false;
  clearTimeout(pesan._t);
  pesan._t = setTimeout(function () { el.toast.hidden = true; }, aksi ? 6000 : 2600);
}

/* ── gambar ── */
function gambar() {
  gambarKepala();
  gambarDaftar();
  gambarArsip();
  gambarKaki();
}

function gambarKepala() {
  var d = new Date(), k = kini();
  el.tgl.textContent = HARI_L[hariKe(k)] + ', ' + d.getDate() + ' ' + BULAN[d.getMonth()];

  var a = aktif();
  var sudah = a.filter(function (h) { return beres(h, k); }).length;
  document.documentElement.style.setProperty('--aksen', a.length ? warnaHex(a[0]) : '#E8A33D');

  if (!S.habit.length) {
    el.judul.textContent = 'Mulai dari satu.';
    el.sub.textContent = 'Tulis kebiasaan di kolom bawah, langsung Enter. Nggak perlu pilih kategori dulu.';
    return;
  }
  if (!a.length) {
    el.judul.textContent = 'Semua diarsipkan.';
    el.sub.textContent = 'Keluarkan lagi dari arsip, atau tulis yang baru.';
    return;
  }
  if (sudah === a.length) {
    el.judul.innerHTML = 'Beres semua, <b>' + sudah + '</b> dari <b>' + a.length + '</b>.';
    el.sub.textContent = 'Benangnya nyambung lagi hari ini. Balik besok.';
    return;
  }
  /* Kalau ada yang nunggu giliran, itu yang paling berguna disebut. */
  var g = a.filter(giliran);
  el.judul.innerHTML = 'Hari ini <b>' + sudah + '</b> dari <b>' + a.length + '</b>.';
  el.sub.textContent = g.length
    ? 'Habis "' + (pemicu(g[0]) || {}).nama + '", giliran "' + g[0].nama + '".'
    : 'Ketuk kotak hari mana saja, termasuk yang kelewat.';
}

function gambarDaftar() {
  el.daftar.textContent = '';
  var a = aktif();

  if (!a.length) {
    var kos = document.createElement('div');
    kos.className = 'kosong';
    var judulKos = S.habit.length ? 'Kosong di sini' : 'Belum ada kebiasaan';
    kos.innerHTML = '<b></b><span></span><div class="kosong__cepat"></div>';
    kos.querySelector('b').textContent = judulKos;
    kos.querySelector('span').textContent = S.habit.length
      ? 'Semua kebiasaanmu ada di arsip.'
      : 'Coba salah satu ini, atau tulis sendiri di atas.';
    if (!S.habit.length) {
      ['Minum air', 'Jalan pagi', 'Baca 10 halaman', 'Nggak buka HP sebelum tidur'].forEach(function (n) {
        var b = document.createElement('button');
        b.type = 'button';
        b.textContent = n;
        b.onclick = function () { tambah(n); };
        kos.querySelector('.kosong__cepat').appendChild(b);
      });
    } else {
      kos.querySelector('.kosong__cepat').remove();
    }
    el.daftar.appendChild(kos);
    return;
  }

  a.forEach(function (h, i) {
    var n = kartu(h, i);
    el.daftar.appendChild(n);
  });
}

function kartu(h, urut) {
  var n = el.tpl.content.firstElementChild.cloneNode(true);
  var c = warnaHex(h);
  n.style.setProperty('--c', c);
  n.style.setProperty('--aksen', c);
  n.dataset.id = h.id;
  n.style.animationDelay = Math.min(urut, 8) * 32 + 'ms';

  var p = pemicu(h);
  if (p) n.classList.add('-susun');
  if (giliran(h)) n.classList.add('-giliran');

  n.querySelector('.nama').textContent = h.nama;

  var r = runtun(h), t = total(h);
  var st = n.querySelector('.kartu__stat');
  st.innerHTML = '';
  var b = document.createElement('b');
  b.textContent = r ? r + ' hari nyambung' : 'belum jalan';
  st.appendChild(b);
  var sisa = document.createElement('i');
  sisa.textContent = '  ·  ' + t + ' total' + (p ? '  ·  habis ' + p.nama : '');
  st.appendChild(sisa);

  n.querySelector('.pegang').setAttribute('aria-label', 'Pindah urutan ' + h.nama);

  var menu = n.querySelector('.kartu__menu');
  var kotak = n.querySelector('.kartu__aksi');
  menu.setAttribute('aria-label', 'Aksi untuk ' + h.nama);
  menu.setAttribute('aria-expanded', buka[h.id] ? 'true' : 'false');
  kotak.hidden = !buka[h.id];
  menu.onclick = function () {
    buka[h.id] = !buka[h.id];
    gambar();
  };
  if (buka[h.id]) isiMenu(kotak, h);

  n.querySelector('.hari').innerHTML = HARI_P.map(function (d) {
    return '<span>' + d + '</span>';
  }).join('');

  petak(n.querySelector('.petak'), h);

  /* pembuka pekan lama: satu satunya jalan keluar dari buntu backfill */
  if (butuhLebih(h)) {
    var pl = document.createElement('button');
    pl.type = 'button';
    pl.className = 'lebih';
    pl.textContent = 'Buka 4 pekan sebelumnya';
    pl.onclick = function () {
      luas[h.id] = (luas[h.id] || 0) + 4;
      gambar();
    };
    n.appendChild(pl);
  }
  return n;
}

/* Petak benang. Baris = pekan (Senin..Minggu), kolom = hari.
   Sel yang beruntun horizontal disambung jadi satu batang lewat class -sL/-sR.

   Jumlah baris ikut isi supaya kebiasaan baru nggak menampilkan baris kosong
   yang cuma bikin scroll panjang di HP. TAPI itu bikin buntu: mau isi hari
   3 pekan lalu, selnya belum ada; selnya baru ada kalau sudah ada catatan
   lama. Makanya ada tombol perluas. Tanpa itu backfill jauh mustahil. */
function pekanKartu(h) {
  var tambah = luas[h.id] || 0;
  var dasar = 1;
  var ks = Object.keys(h.log);
  if (ks.length) {
    ks.sort();
    var awal = geser(kini(), -hariKe(kini()));      // Senin pekan ini
    dasar = Math.ceil((jarak(ks[0], awal) + 1) / 7) + 1;
    dasar = Math.max(1, Math.min(pekan, dasar));
  }
  return Math.min(30, dasar + tambah);
}

/* Tombol perluas cuma berguna kalau baris paling atas sudah kepakai. Kalau
   masih kosong, user tinggal ketuk sel di situ, nggak perlu tombol. */
function butuhLebih(h) {
  var baris = pekanKartu(h);
  if (baris >= 30) return false;
  var k = kini();
  var akhir = geser(k, 6 - hariKe(k));
  var mulai = geser(akhir, -(baris * 7 - 1));
  for (var i = 0; i < 7; i++) if (beres(h, geser(mulai, i))) return true;
  return false;
}

function petak(wadah, h) {
  wadah.textContent = '';
  wadah.setAttribute('aria-label', 'Riwayat ' + h.nama + ', ketuk untuk menandai');

  var baris = pekanKartu(h);
  var k = kini();
  var akhir = geser(k, 6 - hariKe(k));            // Minggu pekan ini
  var mulai = geser(akhir, -(baris * 7 - 1));     // Senin, pekan-ke-N ke belakang

  for (var i = 0; i < baris * 7; i++) {
    var t = geser(mulai, i);
    var isi = beres(h, t);
    /* Cuma masa depan yang dikunci. Hari sebelum kebiasaan dibuat TETAP bisa
       diisi: orang sering baru pasang app setelah seminggu jalan, dan riwayat
       itu bukan bohong. Ini yang di HabitKit harus lewat layar Calendar
       terpisah. */
    var luar = jarak(t, k) < 0;

    var s = document.createElement('button');
    s.type = 'button';
    s.className = 'sel';
    s.dataset.t = t;
    s.disabled = luar;

    if (luar) s.classList.add('-luar');
    else if (isi) s.classList.add('-isi');
    else if (t !== k) s.classList.add('-lewat');
    if (t === k) s.classList.add('-kini');

    /* sambungan cuma di dalam satu baris pekan */
    if (isi && !luar) {
      var kol = i % 7;
      if (kol > 0 && beres(h, geser(t, -1))) s.classList.add('-sL');
      if (kol < 6 && beres(h, geser(t, 1))) s.classList.add('-sR');
    }

    var lap = document.createElement('span');
    lap.className = 'b';
    s.appendChild(lap);

    var d = keTgl(t);
    s.setAttribute('aria-pressed', isi ? 'true' : 'false');
    s.setAttribute('aria-label',
      (isi ? 'Sudah' : luar ? 'Belum bisa ditandai' : 'Belum') + ', ' +
      HARI_L[hariKe(t)] + ' ' + d.getDate() + ' ' + BULAN[d.getMonth()]);

    wadah.appendChild(s);
  }
}

function isiMenu(kotak, h) {
  kotak.textContent = '';

  function tombol(label, ikon, kelas, jalan) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'mini' + (kelas ? ' ' + kelas : '');
    b.innerHTML = ikon;
    b.appendChild(document.createTextNode(label));
    b.onclick = jalan;
    kotak.appendChild(b);
    return b;
  }

  var I = {
    edit: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M14 3l3 3-9 9-4 1 1-4z"/></svg>',
    arsip: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 6h14v3H3zM4.5 9v8h11V9M8 12h4"/></svg>',
    buang: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 5.5h14M7.5 5.5V3h5v2.5M5 5.5l1 11h8l1-11"/></svg>'
  };

  tombol('Ganti nama', I.edit, '', function () {
    var baru = prompt('Nama kebiasaan', h.nama);
    if (baru === null) return;
    baru = baru.trim();
    if (!baru) { pesan('Nama nggak boleh kosong'); return; }
    h.nama = baru.slice(0, 48);
    simpan(); gambar();
  });

  /* warna */
  var pw = document.createElement('div');
  pw.className = 'pilihWarna';
  pw.setAttribute('role', 'group');
  pw.setAttribute('aria-label', 'Warna ' + h.nama);
  WARNA.forEach(function (w) {
    var b = document.createElement('button');
    b.type = 'button';
    b.style.setProperty('--c', S.tema === 'terang' ? w.terang : w.gelap);
    b.setAttribute('aria-label', 'Warna ' + w.id);
    b.setAttribute('aria-pressed', h.warna === w.id ? 'true' : 'false');
    b.onclick = function () { h.warna = w.id; simpan(); gambar(); };
    pw.appendChild(b);
  });
  kotak.appendChild(pw);

  /* susun setelah habit lain */
  var kandidat = aktif().filter(function (x) {
    return x.id !== h.id && !muter(h.id, x.id);
  });
  var wrap = document.createElement('div');
  wrap.className = 'susunPilih';
  var sel = document.createElement('select');
  sel.setAttribute('aria-label', 'Kerjakan setelah kebiasaan lain');
  var o0 = document.createElement('option');
  o0.value = '';
  o0.textContent = 'Berdiri sendiri';
  sel.appendChild(o0);
  kandidat.forEach(function (x) {
    var o = document.createElement('option');
    o.value = x.id;
    o.textContent = 'Setelah: ' + x.nama;
    if (h.setelah === x.id) o.selected = true;
    sel.appendChild(o);
  });
  sel.onchange = function () {
    h.setelah = sel.value || null;
    simpan(); gambar();
  };
  wrap.appendChild(sel);
  kotak.appendChild(wrap);

  tombol('Arsipkan', I.arsip, '', function () {
    h.arsip = true;
    buka[h.id] = false;
    simpan(); gambar();
    pesan('"' + h.nama + '" diarsipkan, riwayatnya aman', {
      label: 'Batal',
      jalan: function () { h.arsip = false; simpan(); gambar(); }
    });
  });

  tombol('Hapus', I.buang, '-bahaya', function () {
    var salin = JSON.parse(JSON.stringify(h));
    var idx = S.habit.indexOf(h);
    S.habit.splice(idx, 1);
    S.habit.forEach(function (x) { if (x.setelah === h.id) x.setelah = null; });
    buka[h.id] = false;
    simpan(); gambar();
    pesan('"' + salin.nama + '" dihapus', {
      label: 'Kembalikan',
      jalan: function () { S.habit.splice(idx, 0, salin); simpan(); gambar(); }
    });
  });
}

function gambarArsip() {
  var beku = S.habit.filter(function (h) { return h.arsip; });
  el.arsipBlok.hidden = !beku.length;
  if (!beku.length) return;
  el.arsipHitung.textContent = 'ARSIP (' + beku.length + ')';
  el.arsipIsi.textContent = '';

  beku.forEach(function (h) {
    var d = document.createElement('div');
    d.className = 'beku';
    d.style.setProperty('--c', warnaHex(h));
    var titik = document.createElement('span');
    titik.className = 'beku__titik';
    var t = document.createElement('div');
    t.className = 'beku__t';
    var nb = document.createElement('b');
    nb.textContent = h.nama;
    var sp = document.createElement('span');
    sp.textContent = total(h) + ' hari tercatat · rekor ' + rekor(h);
    t.appendChild(nb); t.appendChild(sp);

    var kel = document.createElement('button');
    kel.type = 'button';
    kel.className = 'mini';
    kel.textContent = 'Keluarkan';
    kel.onclick = function () { h.arsip = false; simpan(); gambar(); };

    var bng = document.createElement('button');
    bng.type = 'button';
    bng.className = 'ikon -kecil';
    bng.setAttribute('aria-label', 'Hapus permanen ' + h.nama);
    bng.innerHTML = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 5.5h14M7.5 5.5V3h5v2.5M5 5.5l1 11h8l1-11"/></svg>';
    bng.onclick = function () {
      var salin = JSON.parse(JSON.stringify(h));
      var idx = S.habit.indexOf(h);
      S.habit.splice(idx, 1);
      simpan(); gambar();
      pesan('"' + salin.nama + '" dihapus dari arsip', {
        label: 'Kembalikan',
        jalan: function () { S.habit.splice(idx, 0, salin); simpan(); gambar(); }
      });
    };

    d.appendChild(titik); d.appendChild(t); d.appendChild(kel); d.appendChild(bng);
    el.arsipIsi.appendChild(d);
  });
}

function gambarKaki() {
  var a = aktif();
  var hari = 0;
  a.forEach(function (h) { hari += total(h); });
  el.rekap.textContent = a.length + ' kebiasaan · ' + hari + ' hari tercatat · cuma di HP ini';
}

/* ── aksi ── */
function tambah(nama) {
  nama = String(nama || '').trim();
  if (!nama) {
    el.galat.textContent = 'Tulis dulu kebiasaannya. Contoh: "Jalan 20 menit".';
    el.galat.hidden = false;
    el.iNama.focus();
    return;
  }
  el.galat.hidden = true;
  /* warna: putar biar nggak nabrak yang sudah dipakai */
  var pakai = {};
  S.habit.forEach(function (h) { pakai[h.warna] = 1; });
  var w = WARNA.filter(function (x) { return !pakai[x.id]; })[0] || WARNA[S.habit.length % WARNA.length];

  S.habit.push({
    id: 'h' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    nama: nama.slice(0, 48),
    warna: w.id,
    setelah: null,
    arsip: false,
    mulai: kini(),
    log: {}
  });
  el.iNama.value = '';
  simpan();
  gambar();
}

function tandai(id, t) {
  var h = null;
  for (var i = 0; i < S.habit.length; i++) if (S.habit[i].id === id) h = S.habit[i];
  if (!h) return;
  if (jarak(t, kini()) < 0) return;            // masa depan, kunci

  var adaSblm = beres(h, t);
  if (adaSblm) delete h.log[t];
  else h.log[t] = 1;
  simpan();

  var rBaru = runtun(h);
  gambar();

  /* animasi cuma di sel yang baru diisi, jangan seluruh petak */
  if (!adaSblm) {
    var s = el.daftar.querySelector('.kartu[data-id="' + id + '"] .sel[data-t="' + t + '"]');
    if (s) s.classList.add('-baru');
    if (rBaru === 7 || rBaru === 21 || rBaru === 30 || rBaru === 66 || rBaru === 100) {
      pesan(rBaru + ' hari nggak putus. Jangan disetop sekarang.');
    }
    if (navigator.vibrate) { try { navigator.vibrate(12); } catch (e) {} }
  }
}

/* ── geser urutan ──────────────────────────────
   Pointer Events, bukan HTML5 drag-and-drop: HTML5 DnD nggak jalan di layar
   sentuh. Handle-nya kelihatan (bukan long-press tersembunyi seperti HabitKit),
   dan tetap bisa lewat keyboard. */
var G = null;

function mulaiGeser(e, kartuEl) {
  if (G) return;
  var semua = Array.prototype.slice.call(el.daftar.querySelectorAll('.kartu'));
  var dari = semua.indexOf(kartuEl);
  if (dari < 0) return;

  G = {
    el: kartuEl, dari: dari, ke: dari,
    y0: e.clientY,
    tinggi: kartuEl.getBoundingClientRect().height,
    semua: semua,
    kotak: semua.map(function (n) { return n.getBoundingClientRect(); }),
    id: e.pointerId
  };
  kartuEl.classList.add('-angkat');
  semua.forEach(function (n) { if (n !== kartuEl) n.classList.add('-geser'); });
  try { e.target.setPointerCapture(e.pointerId); } catch (err) {}
  e.preventDefault();
}

function jalanGeser(e) {
  if (!G || e.pointerId !== G.id) return;
  var dy = e.clientY - G.y0;
  G.el.style.transform = 'translateY(' + dy + 'px)';

  /* di grid multi kolom, jarak vertikal saja nggak cukup. pakai titik tengah
     kartu yang lagi digeser lalu cari kotak yang menampungnya. */
  var cx = G.kotak[G.dari].left + G.kotak[G.dari].width / 2;
  var cy = G.kotak[G.dari].top + G.kotak[G.dari].height / 2 + dy;

  var ke = G.dari, best = Infinity;
  for (var i = 0; i < G.kotak.length; i++) {
    var r = G.kotak[i];
    var d = Math.hypot(r.left + r.width / 2 - cx, r.top + r.height / 2 - cy);
    if (d < best) { best = d; ke = i; }
  }
  if (ke !== G.ke) {
    G.ke = ke;
    for (var j = 0; j < G.semua.length; j++) {
      if (j === G.dari) continue;
      var n = G.semua[j], t = 0;
      if (G.dari < G.ke && j > G.dari && j <= G.ke) t = -1;
      else if (G.dari > G.ke && j >= G.ke && j < G.dari) t = 1;
      n.style.transform = t ? 'translateY(' + (t * G.tinggi) + 'px)' : '';
    }
  }
}

function selesaiGeser() {
  if (!G) return;
  var g = G; G = null;
  g.semua.forEach(function (n) {
    n.classList.remove('-angkat', '-geser');
    n.style.transform = '';
  });
  if (g.ke !== g.dari) {
    var a = aktif();
    var pindah = a[g.dari], target = a[g.ke];
    var iP = S.habit.indexOf(pindah), iT = S.habit.indexOf(target);
    if (iP > -1 && iT > -1) {
      S.habit.splice(iP, 1);
      S.habit.splice(S.habit.indexOf(target) + (iP < iT ? 1 : 0), 0, pindah);
      simpan();
    }
  }
  gambar();
}

function geserKeyboard(kartuEl, arah) {
  var a = aktif();
  var id = kartuEl.dataset.id;
  var i = -1;
  for (var k = 0; k < a.length; k++) if (a[k].id === id) i = k;
  var j = i + arah;
  if (i < 0 || j < 0 || j >= a.length) return;
  var iP = S.habit.indexOf(a[i]), iT = S.habit.indexOf(a[j]);
  S.habit.splice(iP, 1);
  S.habit.splice(iT, 0, a[i]);
  simpan();
  gambar();
  var lagi = el.daftar.querySelector('.kartu[data-id="' + id + '"] .pegang');
  if (lagi) lagi.focus();
}

/* ── tema ── */
function pasangTema() {
  var t = S.tema;
  if (t === 'sistem') {
    t = window.matchMedia('(prefers-color-scheme: light)').matches ? 'terang' : 'gelap';
  }
  document.documentElement.dataset.tema = t;
  var m = document.querySelector('meta[name=theme-color]');
  if (m) m.setAttribute('content', t === 'terang' ? '#F7F4EC' : '#17150F');

  var ikon = t === 'terang'
    ? '<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="3.6" fill="none" stroke="currentColor"/><path d="M10 1.6v2M10 16.4v2M18.4 10h-2M3.6 10h-2M15.9 4.1l-1.4 1.4M5.5 14.5l-1.4 1.4M15.9 15.9l-1.4-1.4M5.5 5.5L4.1 4.1"/></svg>'
    : '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M16.5 12.4A7 7 0 017.6 3.5a7 7 0 108.9 8.9z"/></svg>';
  document.getElementById('bTema').innerHTML = ikon;

  Array.prototype.forEach.call(el.sheet.querySelectorAll('.segmen button'), function (b) {
    b.setAttribute('aria-checked', b.dataset.tema === S.tema ? 'true' : 'false');
  });
}

/* ── lebar petak: hitung dari lebar nyata, bukan tebak lewat vw ── */
function hitungPekan() {
  var lebar = window.innerWidth;
  var baru = lebar >= 1000 ? 8 : lebar >= 700 ? 7 : lebar >= 420 ? 6 : 5;
  if (baru !== pekan) { pekan = baru; return true; }
  return false;
}

/* ── ekspor / impor ── */
function ekspor() {
  var data = JSON.stringify({ app: 'terusin', v: 1, waktu: new Date().toISOString(), habit: S.habit }, null, 2);
  var b = new Blob([data], { type: 'application/json' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(b);
  a.download = 'terusin-' + kini() + '.json';
  a.click();
  setTimeout(function () { URL.revokeObjectURL(a.href); }, 3000);
  pesan('File tersimpan');
}

function impor(file) {
  var r = new FileReader();
  r.onload = function () {
    try {
      var d = JSON.parse(r.result);
      var arr = Array.isArray(d) ? d : d.habit;
      if (!Array.isArray(arr)) throw new Error('bentuk salah');
      /* WAJIB lewat pulihkan(), jangan disanitasi sendiri di sini. File impor
         datang dari luar, jadi ini permukaan serang: warna bisa berisi
         'javascript:...', kunci log bisa berisi tag HTML, dan 'setelah' bisa
         menunjuk hantu atau bikin rantai muter. pulihkan() sudah menangani
         semua itu plus id kembar. Dulu di sini pakai filter+map manual dan
         semua pemeriksaan itu terlewat. */
      var bersih = pulihkan(arr);
      if (!bersih.length) throw new Error('kosong');
      var lama = S.habit;
      S.habit = bersih;
      simpan(); gambar();
      pesan(bersih.length + ' kebiasaan dimuat', {
        label: 'Batal',
        jalan: function () { S.habit = lama; simpan(); gambar(); }
      });
    } catch (e) {
      pesan('File itu bukan cadangan Terusin');
    }
  };
  r.onerror = function () { pesan('Gagal baca file'); };
  r.readAsText(file);
}

/* ── pasang event ── */
function pasang() {
  el.fTambah.addEventListener('submit', function (e) {
    e.preventDefault();
    tambah(el.iNama.value);
  });
  el.iNama.addEventListener('input', function () { el.galat.hidden = true; });

  /* satu listener untuk seluruh daftar, kartu digambar ulang terus */
  el.daftar.addEventListener('click', function (e) {
    var s = e.target.closest('.sel');
    if (!s || s.disabled) return;
    var k = s.closest('.kartu');
    if (!k) return;
    tandai(k.dataset.id, s.dataset.t);
  });

  el.daftar.addEventListener('pointerdown', function (e) {
    var p = e.target.closest('.pegang');
    if (!p || e.button) return;
    mulaiGeser(e, p.closest('.kartu'));
  });
  document.addEventListener('pointermove', jalanGeser);
  document.addEventListener('pointerup', selesaiGeser);
  document.addEventListener('pointercancel', selesaiGeser);

  el.daftar.addEventListener('keydown', function (e) {
    var p = e.target.closest('.pegang');
    if (!p) return;
    if (e.key === 'ArrowUp') { e.preventDefault(); geserKeyboard(p.closest('.kartu'), -1); }
    if (e.key === 'ArrowDown') { e.preventDefault(); geserKeyboard(p.closest('.kartu'), 1); }
  });

  el.bArsip.addEventListener('click', function () {
    var b = el.arsipIsi.hidden;
    el.arsipIsi.hidden = !b;
    el.bArsip.setAttribute('aria-expanded', b ? 'true' : 'false');
  });

  document.getElementById('bTema').addEventListener('click', function () {
    S.tema = document.documentElement.dataset.tema === 'terang' ? 'gelap' : 'terang';
    simpan(); pasangTema(); gambar();
  });

  /* sheet */
  var bukaSheet = document.getElementById('bSetel');
  function tutupSheet() {
    el.sheet.hidden = true;
    bukaSheet.setAttribute('aria-expanded', 'false');
    bukaSheet.focus();
  }
  bukaSheet.addEventListener('click', function () {
    el.sheet.hidden = false;
    bukaSheet.setAttribute('aria-expanded', 'true');
    document.getElementById('bTutupSheet').focus();
  });
  document.getElementById('sheetTirai').addEventListener('click', tutupSheet);
  document.getElementById('bTutupSheet').addEventListener('click', tutupSheet);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !el.sheet.hidden) tutupSheet();
  });

  Array.prototype.forEach.call(el.sheet.querySelectorAll('.segmen button'), function (b) {
    b.addEventListener('click', function () {
      S.tema = b.dataset.tema;
      simpan(); pasangTema(); gambar();
    });
  });
  window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', function () {
    if (S.tema === 'sistem') { pasangTema(); gambar(); }
  });

  document.getElementById('bEkspor').addEventListener('click', ekspor);
  var iFile = document.getElementById('iFile');
  document.getElementById('bImpor').addEventListener('click', function () { iFile.click(); });
  iFile.addEventListener('change', function () {
    if (iFile.files && iFile.files[0]) impor(iFile.files[0]);
    iFile.value = '';
  });

  document.getElementById('bReset').addEventListener('click', function () {
    var lama = JSON.parse(JSON.stringify(S.habit));
    if (!lama.length) { pesan('Belum ada apa apa'); return; }
    S.habit = [];
    buka = {};
    simpan(); gambar();
    pesan('Semua dihapus', {
      label: 'Kembalikan',
      jalan: function () { S.habit = lama; simpan(); gambar(); }
    });
  });

  /* lebar berubah -> jumlah pekan berubah */
  var rz;
  window.addEventListener('resize', function () {
    clearTimeout(rz);
    rz = setTimeout(function () { if (hitungPekan()) gambar(); }, 140);
  });

  /* balik ke app besoknya, tanggal sudah ganti */
  var hariCache = kini();
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) return;
    if (kini() !== hariCache) { hariCache = kini(); gambar(); }
  });
}

/* ── jalan ── */
muat();
hitungPekan();
pasangTema();
pasang();
gambar();
document.getElementById('sheetVersi').textContent = 'Terusin v' + VERSI + ' · buatan Alfin';

if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('sw.js').catch(function () {});
  });
}

})();
