// Measures Stream Deck key legibility: ON/OFF must differ in GREYSCALE, not only hue,
// and enough of the key must actually emit light to survive the keycap diffuser.
import { readFileSync } from "node:fs";
import { inflateSync } from "node:zlib";
import { Resvg } from "@resvg/resvg-js";

const SIZE = 72;

function decodePng(buf) {
  let pos = 8, w = 0, h = 0, depth = 0, type = 0;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const tag = buf.toString("ascii", pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (tag === "IHDR") {
      w = data.readUInt32BE(0); h = data.readUInt32BE(4);
      depth = data[8]; type = data[9];
      if (depth !== 8 || (type !== 6 && type !== 2)) throw new Error(`unsupported PNG depth=${depth} type=${type}`);
    } else if (tag === "IDAT") idat.push(data);
    else if (tag === "IEND") break;
    pos += 12 + len;
  }
  const ch = type === 6 ? 4 : 3;
  const raw = inflateSync(Buffer.concat(idat));
  const out = Buffer.alloc(w * h * 4);
  const stride = w * ch;
  let prev = Buffer.alloc(stride);
  for (let y = 0; y < h; y++) {
    const filter = raw[y * (stride + 1)];
    const line = Buffer.from(raw.subarray(y * (stride + 1) + 1, y * (stride + 1) + 1 + stride));
    for (let i = 0; i < stride; i++) {
      const a = i >= ch ? line[i - ch] : 0, b = prev[i], c = i >= ch ? prev[i - ch] : 0;
      if (filter === 1) line[i] = (line[i] + a) & 255;
      else if (filter === 2) line[i] = (line[i] + b) & 255;
      else if (filter === 3) line[i] = (line[i] + ((a + b) >> 1)) & 255;
      else if (filter === 4) {
        const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        line[i] = (line[i] + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 255;
      }
    }
    prev = line;
    for (let x = 0; x < w; x++) {
      out[(y * w + x) * 4] = line[x * ch];
      out[(y * w + x) * 4 + 1] = line[x * ch + 1];
      out[(y * w + x) * 4 + 2] = line[x * ch + 2];
      out[(y * w + x) * 4 + 3] = ch === 4 ? line[x * ch + 3] : 255;
    }
  }
  return { width: w, height: h, pixels: out };
}

function boxResize(src, size) {
  const out = Buffer.alloc(size * size * 4);
  const fx = src.width / size, fy = src.height / size;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const x0 = Math.floor(x * fx), x1 = Math.max(x0 + 1, Math.floor((x + 1) * fx));
    const y0 = Math.floor(y * fy), y1 = Math.max(y0 + 1, Math.floor((y + 1) * fy));
    let r = 0, g = 0, b = 0, n = 0;
    for (let sy = y0; sy < y1; sy++) for (let sx = x0; sx < x1; sx++) {
      const i = (sy * src.width + sx) * 4;
      r += src.pixels[i]; g += src.pixels[i + 1]; b += src.pixels[i + 2]; n++;
    }
    const o = (y * size + x) * 4;
    out[o] = r / n; out[o + 1] = g / n; out[o + 2] = b / n; out[o + 3] = 255;
  }
  return { width: size, height: size, pixels: out };
}

export function rasterise(file, size = SIZE) {
  if (file.endsWith(".svg")) {
    const r = new Resvg(readFileSync(file, "utf8"), { fitTo: { mode: "width", value: size } }).render();
    return { width: r.width, height: r.height, pixels: Buffer.from(r.pixels) };
  }
  return boxResize(decodePng(readFileSync(file)), size);
}

const luma = (p, i) => 0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2];

export function metrics(onFile, offFile, size = SIZE) {
  const on = rasterise(onFile, size), off = rasterise(offFile, size);
  const n = size * size;
  let sumDiff = 0, over25 = 0, sumOn = 0, sumOff = 0, litOn = 0, litOff = 0;
  for (let i = 0; i < n; i++) {
    const a = luma(on.pixels, i * 4), b = luma(off.pixels, i * 4);
    sumDiff += Math.abs(a - b);
    if (Math.abs(a - b) > 25) over25++;
    sumOn += a; sumOff += b;
    if (a > 128) litOn++;
    if (b > 128) litOff++;
  }
  return {
    meanAbsDiff: +(sumDiff / n).toFixed(1),
    pctOver25: +((over25 / n) * 100).toFixed(1),
    meanLumaOn: +(sumOn / n).toFixed(1),
    meanLumaOff: +(sumOff / n).toFixed(1),
    litPctOn: +((litOn / n) * 100).toFixed(1),
    litPctOff: +((litOff / n) * 100).toFixed(1)
  };
}

if (process.argv[1] && process.argv[1].endsWith("legibility.mjs") && process.argv[2]) {
  console.log(metrics(process.argv[2], process.argv[3]));
}
