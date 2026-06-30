const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const assetDir = path.join(root, 'electron', 'assets');
fs.mkdirSync(assetDir, { recursive: true });

function makeSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">
  <defs>
    <linearGradient id="bg" x1="40" y1="20" x2="220" y2="240" gradientUnits="userSpaceOnUse">
      <stop stop-color="#19d3da"/>
      <stop offset="0.52" stop-color="#0f172a"/>
      <stop offset="1" stop-color="#36f39a"/>
    </linearGradient>
    <linearGradient id="line" x1="42" y1="168" x2="220" y2="72" gradientUnits="userSpaceOnUse">
      <stop stop-color="#36f39a"/>
      <stop offset="1" stop-color="#19d3da"/>
    </linearGradient>
  </defs>
  <rect x="18" y="18" width="220" height="220" rx="48" fill="#050816"/>
  <rect x="28" y="28" width="200" height="200" rx="40" fill="url(#bg)" opacity="0.92"/>
  <path d="M56 178L92 142L122 154L158 104L198 78" fill="none" stroke="url(#line)" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/>
  <g fill="#e2e8f0">
    <rect x="70" y="80" width="13" height="65" rx="6"/>
    <rect x="64" y="100" width="25" height="24" rx="5"/>
    <rect x="118" y="72" width="13" height="91" rx="6"/>
    <rect x="112" y="112" width="25" height="36" rx="5"/>
    <rect x="172" y="60" width="13" height="82" rx="6"/>
    <rect x="166" y="76" width="25" height="44" rx="5"/>
  </g>
  <circle cx="198" cy="78" r="13" fill="#36f39a"/>
</svg>`;
}

function createCanvas(size) {
  return new Uint8ClampedArray(size * size * 4);
}

function setPixel(canvas, size, x, y, r, g, b, a = 255) {
  if (x < 0 || y < 0 || x >= size || y >= size) return;
  const i = (y * size + x) * 4;
  canvas[i] = r;
  canvas[i + 1] = g;
  canvas[i + 2] = b;
  canvas[i + 3] = a;
}

function fillRoundedRect(canvas, size, x, y, w, h, radius, color) {
  for (let py = y; py < y + h; py += 1) {
    for (let px = x; px < x + w; px += 1) {
      const cx = px < x + radius ? x + radius : px >= x + w - radius ? x + w - radius - 1 : px;
      const cy = py < y + radius ? y + radius : py >= y + h - radius ? y + h - radius - 1 : py;
      if ((px - cx) ** 2 + (py - cy) ** 2 <= radius ** 2) {
        setPixel(canvas, size, px, py, ...color);
      }
    }
  }
}

function drawLine(canvas, size, x0, y0, x1, y1, width, color) {
  const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
  for (let step = 0; step <= steps; step += 1) {
    const t = step / Math.max(steps, 1);
    const x = Math.round(x0 + (x1 - x0) * t);
    const y = Math.round(y0 + (y1 - y0) * t);
    const r = Math.floor(width / 2);
    for (let dy = -r; dy <= r; dy += 1) {
      for (let dx = -r; dx <= r; dx += 1) {
        if (dx * dx + dy * dy <= r * r) setPixel(canvas, size, x + dx, y + dy, ...color);
      }
    }
  }
}

function drawIcon(size) {
  const canvas = createCanvas(size);
  const scale = size / 256;
  const s = (value) => Math.round(value * scale);

  fillRoundedRect(canvas, size, s(18), s(18), s(220), s(220), s(48), [5, 8, 22, 255]);
  fillRoundedRect(canvas, size, s(28), s(28), s(200), s(200), s(40), [13, 92, 113, 255]);

  for (let y = s(28); y < s(228); y += 1) {
    for (let x = s(28); x < s(228); x += 1) {
      const i = (y * size + x) * 4;
      if (canvas[i + 3] === 0) continue;
      const t = (x + y) / Math.max(size * 2, 1);
      canvas[i] = Math.round(25 * (1 - t) + 54 * t);
      canvas[i + 1] = Math.round(211 * (1 - t) + 243 * t);
      canvas[i + 2] = Math.round(218 * (1 - t) + 154 * t);
    }
  }

  drawLine(canvas, size, s(56), s(178), s(92), s(142), s(14), [54, 243, 154, 255]);
  drawLine(canvas, size, s(92), s(142), s(122), s(154), s(14), [54, 243, 154, 255]);
  drawLine(canvas, size, s(122), s(154), s(158), s(104), s(14), [25, 211, 218, 255]);
  drawLine(canvas, size, s(158), s(104), s(198), s(78), s(14), [25, 211, 218, 255]);

  const candles = [
    [70, 80, 13, 65, 64, 100, 25, 24],
    [118, 72, 13, 91, 112, 112, 25, 36],
    [172, 60, 13, 82, 166, 76, 25, 44]
  ];
  for (const [wx, wy, ww, wh, bx, by, bw, bh] of candles) {
    fillRoundedRect(canvas, size, s(wx), s(wy), Math.max(1, s(ww)), s(wh), s(6), [226, 232, 240, 255]);
    fillRoundedRect(canvas, size, s(bx), s(by), s(bw), s(bh), s(5), [226, 232, 240, 255]);
  }
  fillRoundedRect(canvas, size, s(185), s(65), s(26), s(26), s(13), [54, 243, 154, 255]);
  return canvas;
}

function makeDib(size) {
  const canvas = drawIcon(size);
  const rowBytes = size * 4;
  const xorBytes = rowBytes * size;
  const maskRowBytes = Math.ceil(size / 32) * 4;
  const maskBytes = maskRowBytes * size;
  const buffer = Buffer.alloc(40 + xorBytes + maskBytes);
  buffer.writeUInt32LE(40, 0);
  buffer.writeInt32LE(size, 4);
  buffer.writeInt32LE(size * 2, 8);
  buffer.writeUInt16LE(1, 12);
  buffer.writeUInt16LE(32, 14);
  buffer.writeUInt32LE(0, 16);
  buffer.writeUInt32LE(xorBytes + maskBytes, 20);

  let offset = 40;
  for (let y = size - 1; y >= 0; y -= 1) {
    for (let x = 0; x < size; x += 1) {
      const i = (y * size + x) * 4;
      buffer[offset++] = canvas[i + 2];
      buffer[offset++] = canvas[i + 1];
      buffer[offset++] = canvas[i];
      buffer[offset++] = canvas[i + 3];
    }
  }
  return buffer;
}

function writeIco(sizes) {
  const images = sizes.map(makeDib);
  const headerSize = 6 + images.length * 16;
  const total = headerSize + images.reduce((sum, image) => sum + image.length, 0);
  const ico = Buffer.alloc(total);
  ico.writeUInt16LE(0, 0);
  ico.writeUInt16LE(1, 2);
  ico.writeUInt16LE(images.length, 4);
  let imageOffset = headerSize;
  images.forEach((image, index) => {
    const size = sizes[index];
    const entry = 6 + index * 16;
    ico[entry] = size >= 256 ? 0 : size;
    ico[entry + 1] = size >= 256 ? 0 : size;
    ico[entry + 2] = 0;
    ico[entry + 3] = 0;
    ico.writeUInt16LE(1, entry + 4);
    ico.writeUInt16LE(32, entry + 6);
    ico.writeUInt32LE(image.length, entry + 8);
    ico.writeUInt32LE(imageOffset, entry + 12);
    image.copy(ico, imageOffset);
    imageOffset += image.length;
  });
  fs.writeFileSync(path.join(assetDir, 'icon.ico'), ico);
}

fs.writeFileSync(path.join(assetDir, 'icon.svg'), makeSvg());
writeIco([256, 64, 48, 32, 16]);
console.log(`Generated desktop assets in ${assetDir}`);
