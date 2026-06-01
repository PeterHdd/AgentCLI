const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const iconset = path.join(root, "assets", "icon.iconset");
const out = path.join(root, "assets", "icon.icns");

const entries = [
  ["icp4", "icon_16x16.png"],
  ["icp5", "icon_32x32.png"],
  ["icp6", "icon_32x32@2x.png"],
  ["ic07", "icon_128x128.png"],
  ["ic08", "icon_256x256.png"],
  ["ic09", "icon_512x512.png"],
  ["ic10", "icon_512x512@2x.png"]
];

function chunk(type, payload) {
  const header = Buffer.alloc(8);
  header.write(type, 0, 4, "ascii");
  header.writeUInt32BE(payload.length + 8, 4);
  return Buffer.concat([header, payload]);
}

const chunks = entries.map(([type, file]) => chunk(type, fs.readFileSync(path.join(iconset, file))));
const length = 8 + chunks.reduce((sum, item) => sum + item.length, 0);
const header = Buffer.alloc(8);
header.write("icns", 0, 4, "ascii");
header.writeUInt32BE(length, 4);
fs.writeFileSync(out, Buffer.concat([header, ...chunks]));
