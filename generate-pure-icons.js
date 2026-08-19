import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

// Precomputed CRC32 table for fast PNG chunk calculation
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
 * @param {'launcher' | 'launcher_round' | 'foreground' | 'monochrome' | 'notification' | 'splash'} mode 
 * @returns {Buffer}
 */
export function createPng(width, height, mode = 'launcher') {
  const raw = Buffer.alloc(height * (1 + width * 4));
  let offset = 0;

  const cx = (width - 1) / 2;
  const cy = (height - 1) / 2;
  const halfMin = Math.min(width, height) / 2;

  // Scale factor for adaptive foreground to keep emblem within the safe center zone
  const scale = (mode === 'foreground' || mode === 'monochrome') ? 0.62 : (mode === 'notification' ? 0.78 : 0.85);

  for (let y = 0; y < height; y++) {
    raw[offset++] = 0; // Filter method: 0 (None)
    for (let x = 0; x < width; x++) {
      // Normalized coordinates [-1, 1]
      const nx = (x - cx) / halfMin;
      const ny = (y - cy) / halfMin;
      const rDist = Math.sqrt(nx * nx + ny * ny);

      let r = 0, g = 0, b = 0, a = 0;

      if (mode === 'notification') {
        // Pure white icon on transparent background
        const snx = nx / scale;
        const sny = (ny + 0.05) / scale;

        // Upper chevron wing
        const wing1Dist = Math.abs(sny - (-0.38 + Math.abs(snx) * 0.92));
        const inWing1 = (wing1Dist <= 0.13) && (Math.abs(snx) <= 0.58) && (sny >= -0.44) && (sny <= 0.16);

        // Lower chevron wing
        const wing2Dist = Math.abs(sny - (-0.08 + Math.abs(snx) * 0.95));
        const inWing2 = (wing2Dist <= 0.11) && (Math.abs(snx) <= 0.48) && (sny >= -0.12) && (sny <= 0.38);

        // Center diamond
        const inDiamond = (Math.abs(snx) * 1.35 + Math.abs(sny - 0.14)) <= 0.15;

        // Bottom stabilizer
        const inBar = (sny >= 0.44 && sny <= 0.52 && Math.abs(snx) <= 0.32);

        if (inWing1 || inWing2 || inDiamond || inBar) {
          r = 255; g = 255; b = 255; a = 255;
        } else {
          r = 0; g = 0; b = 0; a = 0;
        }
      } else if (mode === 'monochrome') {
        // Android 13+ Themed icon: Pure white silhouette on transparent background
        const snx = nx / scale;
        const sny = (ny + 0.03) / scale;

        const wing1Dist = Math.abs(sny - (-0.38 + Math.abs(snx) * 0.92));
        const inWing1 = (wing1Dist <= 0.13) && (Math.abs(snx) <= 0.58) && (sny >= -0.44) && (sny <= 0.16);

        const wing2Dist = Math.abs(sny - (-0.08 + Math.abs(snx) * 0.95));
        const inWing2 = (wing2Dist <= 0.11) && (Math.abs(snx) <= 0.48) && (sny >= -0.12) && (sny <= 0.38);

        const inDiamond = (Math.abs(snx) * 1.35 + Math.abs(sny - 0.14)) <= 0.15;
        const inBar = (sny >= 0.44 && sny <= 0.52 && Math.abs(snx) <= 0.32);

        if (inWing1 || inWing2 || inDiamond || inBar) {
          r = 255; g = 255; b = 255; a = 255;
        } else {
          r = 0; g = 0; b = 0; a = 0;
        }
      } else if (mode === 'foreground') {
        // Adaptive foreground: Brand colored emblem on transparent background
        const snx = nx / scale;
        const sny = (ny + 0.03) / scale;

        const wing1Dist = Math.abs(sny - (-0.38 + Math.abs(snx) * 0.92));
        const inWing1 = (wing1Dist <= 0.13) && (Math.abs(snx) <= 0.58) && (sny >= -0.44) && (sny <= 0.16);

        const wing2Dist = Math.abs(sny - (-0.08 + Math.abs(snx) * 0.95));
        const inWing2 = (wing2Dist <= 0.11) && (Math.abs(snx) <= 0.48) && (sny >= -0.12) && (sny <= 0.38);

        const inDiamond = (Math.abs(snx) * 1.35 + Math.abs(sny - 0.14)) <= 0.15;
        const inBar = (sny >= 0.44 && sny <= 0.52 && Math.abs(snx) <= 0.32);

        if (inWing1 || inDiamond) {
          // Pure White
          r = 255; g = 255; b = 255; a = 255;
        } else if (inWing2 || inBar) {
          // Primary Brand Blue (#1565FF)
          r = 21; g = 101; b = 255; a = 255;
        } else {
          r = 0; g = 0; b = 0; a = 0;
        }
      } else if (mode === 'launcher_round') {
        // Circular Launcher Icon
        if (rDist > 0.98) {
          r = 0; g = 0; b = 0; a = 0;
        } else {
          // Background Deep Navy (#0B1220) with blue radial gradient
          const grad = Math.max(0, 1 - rDist * 0.8);
          r = Math.round(11 + 10 * grad);
          g = Math.round(18 + 20 * grad);
          b = Math.round(32 + 50 * grad);
          a = 255;

          // Outer Accent Ring (between 0.90 and 0.98)
          if (rDist >= 0.90 && rDist <= 0.98) {
            r = 21; g = 101; b = 255; a = 255;
          } else {
            // Render Core Emblem
            const snx = nx / scale;
            const sny = (ny + 0.03) / scale;

            const wing1Dist = Math.abs(sny - (-0.38 + Math.abs(snx) * 0.92));
            const inWing1 = (wing1Dist <= 0.13) && (Math.abs(snx) <= 0.58) && (sny >= -0.44) && (sny <= 0.16);

            const wing2Dist = Math.abs(sny - (-0.08 + Math.abs(snx) * 0.95));
            const inWing2 = (wing2Dist <= 0.11) && (Math.abs(snx) <= 0.48) && (sny >= -0.12) && (sny <= 0.38);

            const inDiamond = (Math.abs(snx) * 1.35 + Math.abs(sny - 0.14)) <= 0.15;
            const inBar = (sny >= 0.44 && sny <= 0.52 && Math.abs(snx) <= 0.32);

            if (inWing1 || inDiamond) {
              r = 255; g = 255; b = 255; a = 255;
            } else if (inWing2 || inBar) {
              r = 21; g = 101; b = 255; a = 255;
            }
          }
        }
      } else {
        // Standard Square / Rounded Rect Launcher Icon & Splash
        // Squircle mask: (nx^4 + ny^4) <= 0.88
        const squircle = Math.pow(nx, 4) + Math.pow(ny, 4);
        if (squircle > 0.92 && mode !== 'splash') {
          r = 0; g = 0; b = 0; a = 0;
        } else {
          // Deep Navy (#0B1220) background with radial gradient
          const grad = Math.max(0, 1 - rDist * 0.7);
          r = Math.round(11 + 10 * grad);
          g = Math.round(18 + 20 * grad);
          b = Math.round(32 + 50 * grad);
          a = 255;

          // Squircle Outer Accent Border
          if (squircle >= 0.82 && squircle <= 0.92 && mode !== 'splash') {
            r = 21; g = 101; b = 255; a = 255;
          } else {
            // Render Core Emblem
            const snx = nx / scale;
            const sny = (ny + 0.03) / scale;

            const wing1Dist = Math.abs(sny - (-0.38 + Math.abs(snx) * 0.92));
            const inWing1 = (wing1Dist <= 0.13) && (Math.abs(snx) <= 0.58) && (sny >= -0.44) && (sny <= 0.16);

            const wing2Dist = Math.abs(sny - (-0.08 + Math.abs(snx) * 0.95));
            const inWing2 = (wing2Dist <= 0.11) && (Math.abs(snx) <= 0.48) && (sny >= -0.12) && (sny <= 0.38);

            const inDiamond = (Math.abs(snx) * 1.35 + Math.abs(sny - 0.14)) <= 0.15;
            const inBar = (sny >= 0.44 && sny <= 0.52 && Math.abs(snx) <= 0.32);

            if (inWing1 || inDiamond) {
              r = 255; g = 255; b = 255; a = 255;
            } else if (inWing2 || inBar) {
              r = 21; g = 101; b = 255; a = 255;
            }
          }
        }
      }

      raw[offset++] = r;
      raw[offset++] = g;
      raw[offset++] = b;
      raw[offset++] = a;
    }
  }

  const compressed = zlib.deflateSync(raw, { level: 9 });

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

/**
 * Completely cleans existing app-owned PNG icons, removes any duplicate resources or node_modules PNGs,
 * and regenerates fresh valid binary PNG files for Auto Parts India branding.
 */
export function generateAllAssets(baseDir = '.') {
  console.log('🚀 [Zero-Dependency PNG Generator] Generating authentic Auto Parts India Android assets...');

  const densities = [
    { name: 'mdpi', size: 48, fgSize: 108, notifSize: 24, splashSize: 192 },
    { name: 'hdpi', size: 72, fgSize: 162, notifSize: 36, splashSize: 288 },
    { name: 'xhdpi', size: 96, fgSize: 216, notifSize: 48, splashSize: 384 },
    { name: 'xxhdpi', size: 144, fgSize: 324, notifSize: 72, splashSize: 576 },
    { name: 'xxxhdpi', size: 192, fgSize: 432, notifSize: 96, splashSize: 768 },
  ];

  const targetResDirs = [
    path.join(baseDir, 'react-native-app/android/app/src/main/res'),
    path.join(baseDir, 'android/app/src/main/res')
  ];

  const appOwnedPngNames = [
    'ic_launcher.png',
    'ic_launcher_round.png',
    'ic_launcher_foreground.png',
    'ic_launcher_monochrome.png',
    'ic_notification.png',
    'splash_logo.png',
    'master_logo.png'
  ];

  for (const resDir of targetResDirs) {
    if (!fs.existsSync(resDir)) continue;

    console.log(`🧹 Cleaning and populating resources in: ${resDir}`);

    // Clean any node_modules PNGs or rogue PNGs from any subdirectory in res
    const subDirs = fs.readdirSync(resDir);
    for (const sub of subDirs) {
      const fullSubPath = path.join(resDir, sub);
      if (!fs.statSync(fullSubPath).isDirectory()) continue;

      // In mipmap-anydpi-v26, ensure NO PNG files exist (XMLs only)
      if (sub === 'mipmap-anydpi-v26') {
        const files = fs.readdirSync(fullSubPath);
        for (const f of files) {
          if (f.endsWith('.png')) {
            fs.unlinkSync(path.join(fullSubPath, f));
            console.log(`  Removed invalid PNG from ${sub}: ${f}`);
          }
        }
        continue;
      }

      // Delete any node_modules copied PNGs
      const files = fs.readdirSync(fullSubPath);
      for (const f of files) {
        if (f.startsWith('node_modules_')) {
          fs.unlinkSync(path.join(fullSubPath, f));
          console.log(`  Removed node_modules asset: ${sub}/${f}`);
        }
      }
    }

    // Generate fresh valid binary PNG files for each density
    for (const { name, size, fgSize, notifSize, splashSize } of densities) {
      const mipmapDir = path.join(resDir, `mipmap-${name}`);
      fs.mkdirSync(mipmapDir, { recursive: true });

      // Clean existing target PNGs before writing fresh ones
      for (const png of ['ic_launcher.png', 'ic_launcher_round.png', 'ic_launcher_foreground.png', 'ic_launcher_monochrome.png', 'ic_notification.png']) {
        const p = path.join(mipmapDir, png);
        if (fs.existsSync(p)) fs.unlinkSync(p);
      }

      fs.writeFileSync(path.join(mipmapDir, 'ic_launcher.png'), createPng(size, size, 'launcher'));
      fs.writeFileSync(path.join(mipmapDir, 'ic_launcher_round.png'), createPng(size, size, 'launcher_round'));
      fs.writeFileSync(path.join(mipmapDir, 'ic_launcher_foreground.png'), createPng(fgSize, fgSize, 'foreground'));
      fs.writeFileSync(path.join(mipmapDir, 'ic_launcher_monochrome.png'), createPng(fgSize, fgSize, 'monochrome'));
      fs.writeFileSync(path.join(mipmapDir, 'ic_notification.png'), createPng(notifSize, notifSize, 'notification'));

      const drawableDir = path.join(resDir, `drawable-${name}`);
      fs.mkdirSync(drawableDir, { recursive: true });

      for (const png of ['ic_notification.png', 'splash_logo.png', 'master_logo.png']) {
        const p = path.join(drawableDir, png);
        if (fs.existsSync(p)) fs.unlinkSync(p);
      }

      fs.writeFileSync(path.join(drawableDir, 'ic_notification.png'), createPng(notifSize, notifSize, 'notification'));
      fs.writeFileSync(path.join(drawableDir, 'splash_logo.png'), createPng(splashSize, splashSize, 'splash'));
      fs.writeFileSync(path.join(drawableDir, 'master_logo.png'), createPng(splashSize, splashSize, 'splash'));
    }
  }

  // Also write master PNGs to web / app asset folders
  const assetDirs = [
    path.join(baseDir, 'public'),
    path.join(baseDir, 'src/assets'),
    path.join(baseDir, 'react-native-app/src/assets')
  ];

  for (const aDir of assetDirs) {
    if (!fs.existsSync(aDir)) continue;
    fs.writeFileSync(path.join(aDir, 'app-icon.png'), createPng(512, 512, 'launcher'));
    fs.writeFileSync(path.join(aDir, 'icon.png'), createPng(512, 512, 'launcher'));
    fs.writeFileSync(path.join(aDir, 'playstore-icon-512.png'), createPng(512, 512, 'launcher'));
    fs.writeFileSync(path.join(aDir, 'notification-icon.png'), createPng(96, 96, 'notification'));
  }

  console.log('✅ Successfully generated authentic Auto Parts India Android binary PNG assets with 100% AAPT2 compatibility!');
}

// Auto-run if executed directly
if (process.argv[1] && process.argv[1].endsWith('generate-pure-icons.js')) {
  generateAllAssets();
}
