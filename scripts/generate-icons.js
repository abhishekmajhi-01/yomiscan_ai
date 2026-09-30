import fs from 'fs';
import zlib from 'zlib';

function createPng(width, height, r, g, b) {
  // Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8); // 8-bit depth
  ihdrData.writeUInt8(6, 9); // RGBA
  ihdrData.writeUInt8(0, 10); // compression
  ihdrData.writeUInt8(0, 11); // filter
  ihdrData.writeUInt8(0, 12); // interlace

  const ihdrChunk = makeChunk('IHDR', ihdrData);

  // Raw image data: filter byte (0) + width * 4 bytes per scanline
  const rowBytes = 1 + width * 4;
  const rawData = Buffer.alloc(rowBytes * height);

  for (let y = 0; y < height; y++) {
    const rowStart = y * rowBytes;
    rawData[rowStart] = 0; // Filter None

    for (let x = 0; x < width; x++) {
      const px = rowStart + 1 + x * 4;
      // Gradient: top-left to bottom-right
      const t = (x + y) / (width + height);
      const pr = Math.round(r * (1 - t) + 56 * t);
      const pg = Math.round(g * (1 - t) + 189 * t);
      const pb = Math.round(b * (1 - t) + 248 * t);

      // Rounded squircle check
      const cx = width / 2;
      const cy = height / 2;
      const dx = Math.abs(x - cx);
      const dy = Math.abs(y - cy);
      const radius = width * 0.44;

      // Simple corner rounding
      const cornerR = width * 0.22;
      let alpha = 255;
      if (dx > cx - cornerR && dy > cy - cornerR) {
        const cdx = dx - (cx - cornerR);
        const cdy = dy - (cy - cornerR);
        if (cdx * cdx + cdy * cdy > cornerR * cornerR) {
          alpha = 0;
        }
      }

      rawData[px] = pr;
      rawData[px + 1] = pg;
      rawData[px + 2] = pb;
      rawData[px + 3] = alpha;
    }
  }

  const compressedData = zlib.deflateSync(rawData);
  const idatChunk = makeChunk('IDAT', compressedData);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function makeChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(4 + 4 + len + 4);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);

  const crc = crc32(chunk.subarray(4, 8 + len));
  chunk.writeUInt32BE(crc, 8 + len);
  return chunk;
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

if (!fs.existsSync('public')) {
  fs.mkdirSync('public');
}

// Generate PWA icons
fs.writeFileSync('public/pwa-192x192.png', createPng(192, 192, 79, 70, 229));
fs.writeFileSync('public/pwa-512x512.png', createPng(512, 512, 79, 70, 229));
fs.writeFileSync('public/pwa-maskable-512x512.png', createPng(512, 512, 79, 70, 229));
fs.writeFileSync('public/apple-touch-icon.png', createPng(180, 180, 79, 70, 229));

console.log('Successfully generated PWA PNG icons!');
