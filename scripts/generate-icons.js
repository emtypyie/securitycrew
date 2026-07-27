// Simple script to generate placeholder PNG icons
// Run with: node scripts/generate-icons.js

import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const iconsDir = join(__dirname, "..", "extension", "icons");

if (!existsSync(iconsDir)) {
  mkdirSync(iconsDir, { recursive: true });
}

// Minimal 1x1 blue PNG (placeholder)
function createMinimalPNG(): Buffer {
  // PNG signature + IHDR + IDAT + IEND for a simple colored pixel
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // We'll create a simple valid PNG using the raw approach
  // For real icons, replace these with actual designed PNGs
  return Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    "base64"
  );
}

const png = createMinimalPNG();
[16, 48, 128].forEach((size) => {
  writeFileSync(join(iconsDir, `icon${size}.png`), png);
  console.log(`Created icon${size}.png`);
});

console.log("Icons generated. Replace with actual designed icons for production.");
