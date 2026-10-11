// Generates PWA icons from the brand SVG. Run once: npm run icons
import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const outDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public/icons');
await mkdir(outDir, { recursive: true });

const svg = (size, rounded = false) => `<svg width="${size}" height="${size}" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0EA77E"/>
      <stop offset="100%" stop-color="#08B981"/>
    </linearGradient>
  </defs>
  ${rounded ? `<rect width="512" height="512" rx="112" fill="url(#bg)"/>` : `<rect width="512" height="512" fill="url(#bg)"/>`}
  <path d="M148 336 L236 128 L276 128 L212 296 L316 296 L308 336 Z" fill="#FFFFFF"/>
  <path d="M332 216 L424 216 L424 252 L360 252 L388 280 L364 304 L316 256 Z" fill="#A7F3D0"/>
  <circle cx="352" cy="368" r="22" fill="#FFFFFF" opacity="0.9"/>
</svg>`;

await writeFile(path.join(outDir, 'icon.svg'), svg(512));

const jobs = [
  ['icon-192.png', 192, false],
  ['icon-512.png', 512, false],
  ['maskable-192.png', 192, true],
  ['maskable-512.png', 512, true],
  ['favicon-32.png', 32, true],
];

for (const [name, size, rounded] of jobs) {
  await sharp(Buffer.from(svg(size, rounded)), { density: 96 })
    .resize(size, size)
    .png()
    .toFile(path.join(outDir, name));
  console.log('wrote', name);
}
