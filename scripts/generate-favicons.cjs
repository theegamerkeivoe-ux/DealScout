const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// SVG Definition: A yellow rounded-square with a crisp white coupon/ticket symbol in the center.
// Matches DealScout branding: amber-400 (#FBBF24) rounded square with white ticket/coupon.
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="dealscoutYellow" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FCD34D"/>
      <stop offset="50%" stop-color="#FBBF24"/>
      <stop offset="100%" stop-color="#F59E0B"/>
    </linearGradient>
    <filter id="subtleShadow" x="-10%" y="-10%" width="120%" height="125%" filterUnits="userSpaceOnUse">
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#000000" flood-opacity="0.12"/>
    </filter>
  </defs>

  <!-- Yellow Rounded Square Base (Apple / Chrome style rounded corners) -->
  <rect width="512" height="512" rx="116" fill="url(#dealscoutYellow)"/>

  <!-- Centered White Coupon / Ticket Symbol -->
  <g transform="translate(256, 256) rotate(-18) translate(-256, -256)" filter="url(#subtleShadow)">
    <!-- Classic Coupon Ticket with Side Semicircle Notches -->
    <path
      d="M 120 186
         C 120 162, 138 144, 162 144
         L 350 144
         C 374 144, 392 162, 392 186
         L 392 222
         A 34 34 0 0 0 392 290
         L 392 326
         C 392 350, 374 368, 350 368
         L 162 368
         C 138 368, 120 350, 120 326
         L 120 290
         A 34 34 0 0 0 120 222
         Z"
      fill="#FFFFFF"
    />

    <!-- Vertical dashed perforated coupon line -->
    <line
      x1="220" y1="164"
      x2="220" y2="348"
      stroke="#FBBF24"
      stroke-width="12"
      stroke-linecap="round"
      stroke-dasharray="14 14"
    />

    <!-- Left stub ticket punch-hole circle -->
    <circle cx="170" cy="256" r="20" fill="#FBBF24"/>

    <!-- Right body coupon discount star / percentage emblem -->
    <!-- Starburst / % icon on main ticket body -->
    <circle cx="304" cy="222" r="16" fill="#FBBF24"/>
    <circle cx="336" cy="290" r="16" fill="#FBBF24"/>
    <line x1="344" y1="214" x2="296" y2="298" stroke="#FBBF24" stroke-width="14" stroke-linecap="round"/>
  </g>
</svg>`;

async function generate() {
  const publicDir = path.resolve(__dirname, '../public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  // 1. Write favicon.svg
  fs.writeFileSync(path.join(publicDir, 'favicon.svg'), svgContent, 'utf-8');
  console.log('Created favicon.svg');

  const svgBuffer = Buffer.from(svgContent);

  // 2. Generate PNG sizes
  const sizes = [
    { name: 'favicon-16x16.png', size: 16 },
    { name: 'favicon-32x32.png', size: 32 },
    { name: 'favicon-48x48.png', size: 48 },
    { name: 'apple-touch-icon.png', size: 180 },
    { name: 'icon-192.png', size: 192 },
    { name: 'icon-512.png', size: 512 },
  ];

  const pngBuffers = {};
  for (const item of sizes) {
    const buf = await sharp(svgBuffer)
      .resize(item.size, item.size)
      .png({ compressionLevel: 9 })
      .toBuffer();
    fs.writeFileSync(path.join(publicDir, item.name), buf);
    pngBuffers[item.size] = buf;
    console.log(`Created ${item.name} (${item.size}x${item.size})`);
  }

  // 3. Create a valid multi-image ICO file containing 16x16, 32x32, and 48x48
  const icoSizes = [16, 32, 48];
  const numImages = icoSizes.length;
  const headerSize = 6;
  const dirEntrySize = 16;
  const headerAndDirSize = headerSize + numImages * dirEntrySize;

  let currentOffset = headerAndDirSize;
  const dirEntries = [];

  for (const s of icoSizes) {
    const pngBuf = pngBuffers[s];
    const entry = Buffer.alloc(16);
    entry.writeUInt8(s === 256 ? 0 : s, 0); // width
    entry.writeUInt8(s === 256 ? 0 : s, 1); // height
    entry.writeUInt8(0, 2); // color count
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(pngBuf.length, 8); // image data size in bytes
    entry.writeUInt32LE(currentOffset, 12); // offset of image data
    dirEntries.push(entry);
    currentOffset += pngBuf.length;
  }

  const icoHeader = Buffer.alloc(6);
  icoHeader.writeUInt16LE(0, 0); // reserved
  icoHeader.writeUInt16LE(1, 2); // type 1 = icon
  icoHeader.writeUInt16LE(numImages, 4); // number of images

  const icoBuffer = Buffer.concat([
    icoHeader,
    ...dirEntries,
    ...icoSizes.map(s => pngBuffers[s])
  ]);

  fs.writeFileSync(path.join(publicDir, 'favicon.ico'), icoBuffer);
  console.log('Created favicon.ico with 16x16, 32x32, 48x48 PNG frames');

  // 4. Create site.webmanifest for PWA / Android / mobile browsers
  const manifest = {
    name: 'Deal Scout — Best Deals & Coupon Codes',
    short_name: 'DealScout',
    description: 'Find verified promo codes, coupons, and discounts.',
    start_url: '/',
    display: 'standalone',
    background_color: '#FBBF24',
    theme_color: '#FBBF24',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any maskable'
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any maskable'
      }
    ]
  };

  fs.writeFileSync(path.join(publicDir, 'site.webmanifest'), JSON.stringify(manifest, null, 2), 'utf-8');
  console.log('Created site.webmanifest');
}

generate().catch(err => {
  console.error('Error generating favicons:', err);
  process.exit(1);
});
