import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

// Exact vector path for M extracted from LiberationSans-Bold at size 370, centered at (256, 256)
const mPath = 'M385.36 383.28L338.02 383.28L338.02 228.99Q338.02 219.78 338.29 210.02Q338.56 200.27 338.92 192.14Q339.47 182.56 339.83 173.53Q336.03 187.80 332.60 200.63Q331.16 206.05 329.53 211.83Q327.90 217.61 326.37 223.03Q324.83 228.45 323.39 233.15Q321.94 237.84 320.86 241.28L274.97 383.28L237.03 383.28L191.14 241.28Q190.06 237.84 188.70 233.15Q187.35 228.45 185.81 223.03Q184.28 217.61 182.65 211.83Q181.02 206.05 179.40 200.63Q175.79 187.80 171.81 173.53Q172.35 184.01 172.89 194.12Q173.26 202.79 173.62 212.37Q173.98 221.94 173.98 228.99L173.98 383.28L126.64 383.28L126.64 128.72L198.01 128.72L243.53 271.09Q245.34 276.69 247.42 284.82Q249.50 292.95 251.48 300.53Q253.65 309.39 256.18 318.96Q258.71 309.57 261.06 300.90Q262.14 297.10 263.23 293.13Q264.31 289.15 265.39 285.36Q266.48 281.56 267.56 278.13Q268.65 274.70 269.55 271.99L314.35 128.72L385.36 128.72';

// 1. Solid square SVG for raster icons (Apple touch icon, PWA icons)
const solidSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" fill="#0B1B4A"/>
  <path d="${mPath}" fill="#FFFFFF"/>
</svg>`;

// 2. Rounded preview SVG for desktop browser tab icon
const roundedSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" rx="112" fill="#0B1B4A"/>
  <path d="${mPath}" fill="#FFFFFF"/>
</svg>`;

async function generate() {
  const publicDir = path.resolve(process.cwd(), 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  // Write SVGs
  fs.writeFileSync(path.join(publicDir, 'icon.svg'), roundedSvg);
  fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.svg'), solidSvg);

  const solidBuffer = Buffer.from(solidSvg);

  // Generate PNGs
  await sharp(solidBuffer).resize(512, 512).png().toFile(path.join(publicDir, 'pwa-512x512.png'));
  await sharp(solidBuffer).resize(512, 512).png().toFile(path.join(publicDir, 'pwa-maskable-512x512.png'));
  await sharp(solidBuffer).resize(192, 192).png().toFile(path.join(publicDir, 'pwa-192x192.png'));
  await sharp(solidBuffer).resize(180, 180).png().toFile(path.join(publicDir, 'apple-touch-icon.png'));
  await sharp(solidBuffer).resize(180, 180).png().toFile(path.join(publicDir, 'apple-touch-icon-precomposed.png'));
  await sharp(solidBuffer).resize(64, 64).png().toFile(path.join(publicDir, 'favicon.png'));
  await sharp(solidBuffer).resize(32, 32).png().toFile(path.join(publicDir, 'favicon-32x32.png'));
  await sharp(solidBuffer).resize(16, 16).png().toFile(path.join(publicDir, 'favicon-16x16.png'));

  console.log('Successfully generated all PWA, iOS and favicon assets in public/');
}

generate().catch(err => {
  console.error(err);
  process.exit(1);
});
