# PWA Icons - Nền tảng Chuyển đổi số Snuol

## Icon source: `favicon.svg`
All PNG icons are generated from `favicon.svg` using sharp.

## Regenerate icons:
```js
node -e "
const sharp = require('sharp');
const fs = require('fs');
const svg = fs.readFileSync('public/icons/favicon.svg');
const sizes = [16, 32, 72, 96, 128, 144, 152, 192, 384, 512];
(async () => {
  for (const s of sizes) await sharp(svg).resize(s,s).png().toFile('public/icons/icon-'+s+'x'+s+'.png');
  await sharp(svg).resize(180,180).png().toFile('public/icons/apple-touch-icon.png');
})();
"
```

## Files:

| File | Size | Purpose |
|------|------|---------|
| favicon.svg | scalable | SVG favicon (primary) |
| icon-16x16.png | 16x16 | Favicon fallback |
| icon-32x32.png | 32x32 | Favicon fallback |
| icon-72x72.png | 72x72 | PWA |
| icon-96x96.png | 96x96 | PWA |
| icon-128x128.png | 128x128 | PWA |
| icon-144x144.png | 144x144 | PWA |
| icon-152x152.png | 152x152 | PWA |
| icon-192x192.png | 192x192 | PWA (required) |
| icon-384x384.png | 384x384 | PWA |
| icon-512x512.png | 512x512 | PWA (required) |
| apple-touch-icon.png | 180x180 | iOS |
| maskable-icon-512x512.png | 512x512 | Android adaptive |
