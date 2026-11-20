import * as fs from "node:fs";
import * as path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const sourcePath = path.resolve(here, "entry.png");
const outDirRaw = process.env.MAKEFUN_OUTPUT_DIR;
const outDir = outDirRaw && outDirRaw.trim() !== "" ? path.resolve(outDirRaw) : "/output";
const destPath = path.resolve(outDir, "entry.png");

function abort(message) {
  console.error("delivery failed: " + message);
  process.exit(1);
}

if (!fs.existsSync(sourcePath)) {
  abort("missing source image at " + sourcePath);
}

let payload;
try {
  payload = fs.readFileSync(sourcePath);
} catch (err) {
  abort("cannot read source image: " + err.message);
}

if (!payload || payload.length === 0) {
  abort("source image is empty");
}

const pngMagic = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const jpegMagic = [0xff, 0xd8, 0xff];
function hasPrefix(bytes, prefix) {
  if (bytes.length < prefix.length) return false;
  for (let i = 0; i < prefix.length; i += 1) {
    if (bytes[i] !== prefix[i]) return false;
  }
  return true;
}
const looksPng = hasPrefix(payload, pngMagic);
const looksJpeg = hasPrefix(payload, jpegMagic);
if (!looksPng && !looksJpeg) {
  abort("source image header is neither PNG nor JPEG");
}

try {
  fs.mkdirSync(outDir, { recursive: true });
} catch (err) {
  abort("cannot create output directory: " + err.message);
}

try {
  fs.writeFileSync(destPath, payload);
} catch (err) {
  abort("cannot write destination image: " + err.message);
}

let writtenBack;
try {
  writtenBack = fs.readFileSync(destPath);
} catch (err) {
  abort("cannot re-read destination for verification: " + err.message);
}
function digestOf(buf) {
  return createHash("sha256").update(buf).digest("hex");
}
const sourceDigest = digestOf(payload);
const destDigest = digestOf(writtenBack);
if (writtenBack.length !== payload.length) {
  abort("verification failed: size mismatch after copy");
}
if (sourceDigest !== destDigest) {
  abort("verification failed: sha256 mismatch after copy");
}

console.log("source: " + sourcePath);
console.log("destination: " + destPath);
console.log("format: " + (looksPng ? "png" : "jpeg"));
console.log("bytes: " + String(payload.length));
console.log("sha256: " + sourceDigest);
console.log("verified: destination matches source");
console.log("status: delivered");
