const { writeFileSync, mkdirSync, existsSync } = require("fs");
const { join, dirname } = require("path");

const iconsDir = join(__dirname, "..", "extension", "icons");

if (!existsSync(iconsDir)) {
  mkdirSync(iconsDir, { recursive: true });
}

// Minimal valid 1x1 PNG (blue pixel) as base64
const pngBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPj/HwADBwIAMCbHYQAAAABJRU5ErkJggg==";
const png = Buffer.from(pngBase64, "base64");

[16, 48, 128].forEach((size) => {
  writeFileSync(join(iconsDir, "icon" + size + ".png"), png);
  console.log("Created icon" + size + ".png");
});

console.log("Done. Replace with actual icons for production.");
