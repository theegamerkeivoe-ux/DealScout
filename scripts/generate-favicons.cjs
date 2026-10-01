const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// SVG Definition: Matches dee.JPG uploaded by user
// A bright yellow squircle with a horizontal tag outline pointing to the left and a circular hole.
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <!-- Bright Yellow Rounded Square (Squircle) matching dee.JPG -->
  <rect width="512" height="512" rx="140" fill="#FFB800"/>

  <!-- Centered Tag Icon matching dee.JPG: pointing to the left, rounded corners, bold black outline, solid hole -->
  <g transform="translate(4, 0)">
    <path
      d="M 146 256
         L 228 174
         C 235 167, 245 164, 256 164
         L 362 164
         C 380 164, 396 180, 396 198
         L 396 314
         C 396 332, 380 348, 362 348
         L 256 348
         C 245 348, 235 345, 228 338
         L 146 256
         Z"
      fill="none"
      stroke="#0A0A0A"
      stroke-width="30"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <circle cx="214" cy="256" r="17" fill="#0A0A0A"/>
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
