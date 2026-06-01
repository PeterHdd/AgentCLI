const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");

const root = path.resolve(__dirname, "..");
const out = path.join(root, "assets", "icon.png");
const size = 1024;
const data = Buffer.alloc(size * size * 4);

function rgba(hex, alpha = 255) {
  const value = parseInt(hex.replace("#", ""), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255, alpha];
}

function blendPixel(x, y, color) {
  if (x < 0 || y < 0 || x >= size || y >= size) return;
  const index = (y * size + x) * 4;
  const alpha = color[3] / 255;
  const inv = 1 - alpha;
  data[index] = Math.round(color[0] * alpha + data[index] * inv);
  data[index + 1] = Math.round(color[1] * alpha + data[index + 1] * inv);
  data[index + 2] = Math.round(color[2] * alpha + data[index + 2] * inv);
  data[index + 3] = Math.round(255 * (alpha + (data[index + 3] / 255) * inv));
}

function fillRoundedRect(x, y, w, h, r, color) {
  for (let py = Math.floor(y); py < y + h; py += 1) {
    for (let px = Math.floor(x); px < x + w; px += 1) {
      const cx = px < x + r ? x + r : px >= x + w - r ? x + w - r - 1 : px;
      const cy = py < y + r ? y + r : py >= y + h - r ? y + h - r - 1 : py;
      if ((px - cx) ** 2 + (py - cy) ** 2 <= r ** 2) blendPixel(px, py, color);
    }
  }
}

function fillRect(x, y, w, h, color) {
  for (let py = Math.floor(y); py < y + h; py += 1) {
    for (let px = Math.floor(x); px < x + w; px += 1) blendPixel(px, py, color);
  }
}

function fillCircle(cx, cy, r, color) {
  for (let py = Math.floor(cy - r); py <= cy + r; py += 1) {
    for (let px = Math.floor(cx - r); px <= cx + r; px += 1) {
      if ((px - cx) ** 2 + (py - cy) ** 2 <= r ** 2) blendPixel(px, py, color);
    }
  }
}

function strokeLine(x1, y1, x2, y2, width, color) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const steps = Math.max(Math.abs(dx), Math.abs(dy));
  for (let i = 0; i <= steps; i += 1) {
    const t = steps === 0 ? 0 : i / steps;
    fillCircle(x1 + dx * t, y1 + dy * t, width / 2, color);
  }
}

function chunk(type, payload) {
  const typeBuffer = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(payload.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, payload])));
  return Buffer.concat([length, typeBuffer, payload, crc]);
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function writePng(file) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y += 1) {
    const row = y * (size * 4 + 1);
    raw[row] = 0;
    data.copy(raw, row + 1, y * size * 4, (y + 1) * size * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0))
  ]);
  fs.writeFileSync(file, png);
}

const bg = rgba("#171c26");
const panel = rgba("#222837");
const text = rgba("#e6ebf7");
const green = rgba("#a6d189");
const blue = rgba("#8caaee");
const yellow = rgba("#e5c890");

fillRoundedRect(94, 94, 836, 836, 188, bg);
fillRoundedRect(146, 160, 732, 704, 92, panel);
strokeLine(274, 352, 414, 512, 68, text);
strokeLine(414, 512, 274, 672, 68, text);
strokeLine(500, 660, 720, 660, 70, green);
fillCircle(716, 340, 62, blue);
fillCircle(802, 480, 38, yellow);
strokeLine(716, 402, 716, 450, 28, blue);
strokeLine(716, 450, 802, 480, 28, blue);

fs.mkdirSync(path.dirname(out), { recursive: true });
writePng(out);
