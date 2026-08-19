import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

// Simple CRC32 implementation for PNG chunks
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);

  const crcData = Buffer.concat([typeBuf, data]);
  const crcVal = crc32(crcData);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crcVal, 0);

  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

/**
 * Creates a valid 32-bit RGBA binary PNG
 * @param {number} width 
 * @param {number} height 
 * @param {[number, number, number, number]} bgColor [R, G, B, A]
 * @param {[number, number, number, number]} fgColor [R, G, B, A]
 * @param {string} mode 'icon' | 'foreground' | 'splash' | 'notification' | 'monochrome'
 */
export function createPng(width, height, bgColor = [21, 101, 255, 255], fgColor = [255, 255, 255, 255], mode = 'icon') {
  const raw = Buffer.alloc(height * (1 + width * 4));
  let offset = 0;

  const cx = width / 2;
  const cy = height / 2;
  const radius = width * 0.42;
  const radiusSq = radius * radius;

  for (let y = 0; y < height; y++) {
    raw[offset++] = 0; // Filter: None
    for (let x = 0; x < width; x++) {
      let [r, g, b, a] = bgColor;

      const dx = x - cx;
      const dy = y - cy;
      const distSq = dx * dx + dy * dy;

      if (mode === 'notification') {
        // Transparent background with white center symbol
        r = 255; g = 255; b = 255;
        const normX = Math.abs(dx) / (width * 0.35);
        const normY = (dy + height * 0.05) / (height * 0.35);
        if (normX + Math.abs(normY) < 0.75 && distSq < (width * 0.38) ** 2) {
          a = 255;
        } else {
          a = 0;
        }
      } else if (mode === 'foreground') {
        // Transparent background, crisp emblem
        if (Math.abs(dx) < width * 0.3 && Math.abs(dy) < height * 0.3) {
          const chevron = (Math.abs(dx) * 1.2 - dy * 0.8);
          if (chevron < width * 0.22 && dy > -height * 0.25) {
            [r, g, b, a] = fgColor;
          } else {
            a = 0;
          }
        } else {
          a = 0;
        }
      } else if (mode === 'monochrome') {
        // Grayscale / monochrome
        if (distSq < radiusSq) {
          [r, g, b, a] = [240, 240, 240, 255];
          if (Math.abs(dx) < width * 0.25 && Math.abs(dy) < height * 0.25) {
            [r, g, b, a] = [20, 20, 20, 255];
          }
        } else {
          [r, g, b, a] = [0, 0, 0, 0];
        }
      } else {
        // Standard Icon / Splash: rounded rect or circular emblem
        if (mode === 'round') {
          if (distSq > (width * 0.48) ** 2) {
            a = 0;
          }
        }
        // Draw inner white emblem
        const innerDist = Math.abs(dx) + Math.abs(dy);
        if (innerDist < width * 0.28 && dy > -height * 0.2 && dy < height * 0.25) {
          [r, g, b, a] = fgColor;
        }
      }

      raw[offset++] = r;
      raw[offset++] = g;
      raw[offset++] = b;
      raw[offset++] = a;
    }
  }

  const compressed = zlib.deflateSync(raw);

  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // 8 bits per channel
  ihdrData[9] = 6; // RGBA
  ihdrData[10] = 0; // Deflate
  ihdrData[11] = 0; // Filter
  ihdrData[12] = 0; // Non-interlaced

  const ihdrChunk = makeChunk('IHDR', ihdrData);
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, ihdrChunk, idatChunk, iendChunk]);
}

export function generateAllAssets(baseDir = '.') {
  const densities = [
    { name: 'mdpi', size: 48, notifSize: 24, splashSize: 256 },
    { name: 'hdpi', size: 72, notifSize: 36, splashSize: 384 },
    { name: 'xhdpi', size: 96, notifSize: 48, splashSize: 512 },
    { name: 'xxhdpi', size: 144, notifSize: 72, splashSize: 768 },
    { name: 'xxxhdpi', size: 192, notifSize: 96, splashSize: 1024 },
  ];

  const targetResDirs = [
    path.join(baseDir, 'react-native-app/android/app/src/main/res'),
    path.join(baseDir, 'android/app/src/main/res')
  ];

  for (const resDir of targetResDirs) {
    if (!fs.existsSync(resDir)) continue;

    console.log(`[Pure PNG Generator] Populating Android resources in: ${resDir}`);

    // Clean anydpi png conflicts
    const anyDpiDir = path.join(resDir, 'mipmap-anydpi-v26');
    if (fs.existsSync(anyDpiDir)) {
      const files = fs.readdirSync(anyDpiDir);
      for (const f of files) {
        if (f.endsWith('.png')) {
          fs.unlinkSync(path.join(anyDpiDir, f));
          console.log(`  Removed conflicting PNG: mipmap-anydpi-v26/${f}`);
        }
      }
    }

    // Remove conflicting background xmls
    for (const d of fs.readdirSync(resDir)) {
      const fullPath = path.join(resDir, d);
      if (fs.statSync(fullPath).isDirectory()) {
        const bgXml = path.join(fullPath, 'ic_launcher_background.xml');
        if (fs.existsSync(bgXml)) {
          fs.unlinkSync(bgXml);
          console.log(`  Removed redundant XML: ${d}/ic_launcher_background.xml`);
        }
      }
    }

    // Generate density mipmaps
    for (const { name, size, notifSize, splashSize } of densities) {
      const mipmapDir = path.join(resDir, `mipmap-${name}`);
      fs.mkdirSync(mipmapDir, { recursive: true });

      fs.writeFileSync(path.join(mipmapDir, 'ic_launcher.png'), createPng(size, size, [21, 101, 255, 255], [255, 255, 255, 255], 'icon'));
      fs.writeFileSync(path.join(mipmapDir, 'ic_launcher_round.png'), createPng(size, size, [21, 101, 255, 255], [255, 255, 255, 255], 'round'));
      fs.writeFileSync(path.join(mipmapDir, 'ic_launcher_foreground.png'), createPng(size, size, [0, 0, 0, 0], [255, 255, 255, 255], 'foreground'));
      fs.writeFileSync(path.join(mipmapDir, 'ic_launcher_monochrome.png'), createPng(size, size, [0, 0, 0, 0], [255, 255, 255, 255], 'monochrome'));
      fs.writeFileSync(path.join(mipmapDir, 'ic_notification.png'), createPng(notifSize, notifSize, [0, 0, 0, 0], [255, 255, 255, 255], 'notification'));

      // Generate density drawables
      const drawableDir = path.join(resDir, `drawable-${name}`);
      fs.mkdirSync(drawableDir, { recursive: true });

      fs.writeFileSync(path.join(drawableDir, 'ic_notification.png'), createPng(notifSize, notifSize, [0, 0, 0, 0], [255, 255, 255, 255], 'notification'));
      fs.writeFileSync(path.join(drawableDir, 'splash_logo.png'), createPng(splashSize, splashSize, [21, 101, 255, 255], [255, 255, 255, 255], 'icon'));
      fs.writeFileSync(path.join(drawableDir, 'master_logo.png'), createPng(splashSize, splashSize, [21, 101, 255, 255], [255, 255, 255, 255], 'icon'));
    }
  }

  // Also save master PNGs to assets folders
  const assetDirs = [
    path.join(baseDir, 'public'),
    path.join(baseDir, 'src/assets'),
    path.join(baseDir, 'react-native-app/src/assets')
  ];

  for (const aDir of assetDirs) {
    if (!fs.existsSync(aDir)) continue;
    fs.writeFileSync(path.join(aDir, 'app-icon.png'), createPng(512, 512, [21, 101, 255, 255], [255, 255, 255, 255], 'icon'));
    fs.writeFileSync(path.join(aDir, 'icon.png'), createPng(512, 512, [21, 101, 255, 255], [255, 255, 255, 255], 'icon'));
    fs.writeFileSync(path.join(aDir, 'playstore-icon-512.png'), createPng(512, 512, [21, 101, 255, 255], [255, 255, 255, 255], 'icon'));
    fs.writeFileSync(path.join(aDir, 'notification-icon.png'), createPng(96, 96, [0, 0, 0, 0], [255, 255, 255, 255], 'notification'));
  }

  console.log('✅ All Android PNG assets generated with 100% valid 32-bit binary headers!');
}

if (process.argv[1] && process.argv[1].endsWith('generate-pure-icons.js')) {
  generateAllAssets();
}
