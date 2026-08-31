// Renders www/icon.svg into the PNG assets used by the PWA manifest and by
// @capacitor/assets (which then produces every Android launcher density).
import sharp from 'sharp';
import { readFileSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const svg = readFileSync(join(root, 'www', 'icon.svg'));

if (!existsSync(join(root, 'resources'))) mkdirSync(join(root, 'resources'));

async function png(size, outPath, background) {
  let img = sharp(svg, { density: 384 }).resize(size, size, {
    fit: 'contain',
    background: background || { r: 255, g: 255, b: 255, alpha: 1 },
  });
  if (background) img = img.flatten({ background });
  await img.png().toFile(join(root, outPath));
  console.log('wrote', outPath);
}

await Promise.all([
  // PWA icons
  png(192, 'www/icon-192.png'),
  png(512, 'www/icon-512.png'),
  // Source for @capacitor/assets -> generates all Android launcher densities
  png(1024, 'resources/icon.png'),
  png(1024, 'resources/icon-only.png'),
  png(1024, 'resources/icon-foreground.png'),
]);

// Solid navy splash background with the logo centered
await sharp({
  create: { width: 2732, height: 2732, channels: 4, background: { r: 13, g: 42, b: 82, alpha: 1 } },
})
  .composite([{ input: await sharp(svg, { density: 384 }).resize(900, 900).png().toBuffer() }])
  .png()
  .toFile(join(root, 'resources', 'splash.png'));
console.log('wrote resources/splash.png');
