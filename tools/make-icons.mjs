// Draws the app icons (a white clothes hanger on blue) as PNGs with no dependencies.
// Run from the repo root: node tools/make-icons.mjs
import { deflateSync, crc32 } from 'node:zlib';
import { writeFileSync } from 'node:fs';

const BLUE = [79, 107, 237], WHITE = [255, 255, 255];
const segDist = (px, py, ax, ay, bx, by) => {
  const dx = bx - ax, dy = by - ay, t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - ax - t * dx, py - ay - t * dy);
};
// distance from (x,y) to the hanger outline, in units of the icon width (y grows downward)
function hanger(x, y) {
  y -= 0.05;                                           // optical centring
  const cx = 0.5, cy = 0.29, r = 0.07;                   // hook: circle arc, open at the lower-left
  const a = (Math.atan2(y - cy, x - cx) * 180 / Math.PI + 360) % 360;
  const hook = a > 90 && a < 180
    ? Math.min(Math.hypot(x - (cx - r), y - cy), Math.hypot(x - cx, y - (cy + r)))
    : Math.abs(Math.hypot(x - cx, y - cy) - r);
  const neck = segDist(x, y, cx, cy + r, cx, 0.42);
  const ax = 0.5, ay = 0.42, lx = 0.19, rx = 0.81, by = 0.67; // body: triangle
  const body = Math.min(segDist(x, y, ax, ay, lx, by), segDist(x, y, ax, ay, rx, by), segDist(x, y, lx, by, rx, by));
  return Math.min(hook, neck, body);
}
function png(size, { rounded }) {
  const SS = 4, stroke = 0.042 / 2, radius = 0.22, px = Buffer.alloc(size * (size * 4 + 1));
  for (let j = 0; j < size; j++) {
    px[j * (size * 4 + 1)] = 0; // filter: none
    for (let i = 0; i < size; i++) {
      let bg = 0, fg = 0;
      for (let sj = 0; sj < SS; sj++) for (let si = 0; si < SS; si++) {
        const x = (i + (si + 0.5) / SS) / size, y = (j + (sj + 0.5) / SS) / size;
        let inside = true;
        if (rounded) { const qx = Math.max(Math.abs(x - 0.5) - (0.5 - radius), 0), qy = Math.max(Math.abs(y - 0.5) - (0.5 - radius), 0); inside = Math.hypot(qx, qy) <= radius; }
        if (!inside) continue;
        bg++; if (hanger(x, y) <= stroke) fg++;
      }
      const n = SS * SS, cov = bg / n, f = bg ? fg / bg : 0, o = j * (size * 4 + 1) + 1 + i * 4;
      for (let k = 0; k < 3; k++) px[o + k] = Math.round(BLUE[k] * (1 - f) + WHITE[k] * f);
      px[o + 3] = Math.round(cov * 255);
    }
  }
  const chunk = (type, data) => { const len = Buffer.alloc(4), crc = Buffer.alloc(4), td = Buffer.concat([Buffer.from(type), data]); len.writeUInt32BE(data.length); crc.writeUInt32BE(crc32(td)); return Buffer.concat([len, td, crc]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(px, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}
const out = [['icon-192.png', 192, true], ['icon-512.png', 512, true], ['icon-maskable-192.png', 192, false], ['icon-maskable-512.png', 512, false], ['apple-touch-icon.png', 180, false], ['favicon-32.png', 32, true]];
for (const [name, size, rounded] of out) { writeFileSync(name, png(size, { rounded })); console.log('wrote', name); }
