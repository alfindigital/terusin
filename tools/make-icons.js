/* Generator ikon Terusin. Nol dependency, cuma zlib bawaan Node.
 * Jalankan: node tools/make-icons.js
 * Glyph: satu batang panjang (hari nyambung) + satu kotak kecil terpisah
 * (hari berikutnya yang belum diisi). Sama persis dengan metafora di app.
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const OUT = path.join(__dirname, '..', 'icons');
fs.mkdirSync(OUT, { recursive: true });

const BG = [0x17, 0x15, 0x0f];
const FG = [0xe8, 0xa3, 0x3d];

function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = c ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

function png(w, h, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/* rounded rect: jarak titik ke persegi, dikurangi radius */
function inRR(px, py, x, y, w, h, r) {
  const dx = Math.max(x + r - px, 0, px - (x + w - r));
  const dy = Math.max(y + r - py, 0, py - (y + h - r));
  return dx * dx + dy * dy <= r * r;
}

function render(size, { pad, rounded }) {
  const SS = 4;
  const W = size, H = size;
  const buf = Buffer.alloc(W * H * 4);
  const corner = rounded ? W * 0.22 : 0;

  /* area glyph */
  const gx = W * pad, gw = W * (1 - pad * 2);
  const barH = gw * 0.30;
  const gap = gw * 0.115;
  const longW = gw * 0.60;
  const shortW = gw - longW - gap;
  const gy = (H - barH) / 2;
  const rad = barH * 0.30;

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let hitFg = 0, hitBg = 0, n = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const px = x + (sx + 0.5) / SS;
          const py = y + (sy + 0.5) / SS;
          n++;
          if (corner) {
            const qx = Math.max(corner - px, px - (W - corner), 0);
            const qy = Math.max(corner - py, py - (H - corner), 0);
            if (qx * qx + qy * qy > corner * corner) continue;
          }
          hitBg++;
          if (inRR(px, py, gx, gy, longW, barH, rad) ||
              inRR(px, py, gx + longW + gap, gy, shortW, barH, rad)) hitFg++;
        }
      }
      const i = (y * W + x) * 4;
      const aBg = hitBg / n;
      const aFg = hitFg / n;
      if (aBg === 0) continue;
      const mix = (c1, c2) => Math.round(c1 * (1 - aFg / aBg) + c2 * (aFg / aBg));
      buf[i]     = mix(BG[0], FG[0]);
      buf[i + 1] = mix(BG[1], FG[1]);
      buf[i + 2] = mix(BG[2], FG[2]);
      buf[i + 3] = Math.round(aBg * 255);
    }
  }
  return png(W, H, buf);
}

const jobs = [
  ['icon-192.png',        192,  { pad: 0.20, rounded: true  }],
  ['icon-512.png',        512,  { pad: 0.20, rounded: true  }],
  ['maskable-192.png',    192,  { pad: 0.30, rounded: false }],
  ['maskable-512.png',    512,  { pad: 0.30, rounded: false }],
  ['apple-touch-icon.png', 180, { pad: 0.19, rounded: false }],
  ['favicon-32.png',       32,  { pad: 0.13, rounded: true  }],
  ['icon-1024.png',      1024,  { pad: 0.20, rounded: true  }],
];

for (const [name, size, opt] of jobs) {
  const buf = render(size, opt);
  fs.writeFileSync(path.join(OUT, name), buf);
  console.log(`${name}  ${size}x${size}  ${(buf.length / 1024).toFixed(1)} KB`);
}
console.log('\nselesai ->', OUT);
