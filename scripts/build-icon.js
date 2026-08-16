const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const pngToIco = require('png-to-ico').default;

async function main() {
  const src = path.join(__dirname, '..', 'assets', 'icon.png');
  const outDir = path.join(__dirname, '..', 'assets');
  const sizes = [16, 24, 32, 48, 64, 128, 256];
  const pngBuffers = [];

  for (const size of sizes) {
    const buf = await sharp(src)
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 1 } })
      .png()
      .toBuffer();
    pngBuffers.push(buf);
    fs.writeFileSync(path.join(outDir, `icon-${size}.png`), buf);
  }

  const ico = await pngToIco(pngBuffers);
  fs.writeFileSync(path.join(outDir, 'icon.ico'), ico);
  console.log('Wrote assets/icon.ico and sized PNGs');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
