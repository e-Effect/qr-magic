const fs = require("fs");
const path = require("path");
const src = path.join(__dirname, "..", "public", "index.html");
const dir = path.join(__dirname, "..");
const h = fs.readFileSync(src, "utf8");
const dstJs = path.join(dir, "embedded-index.js");
fs.writeFileSync(
  dstJs,
  "/** Auto-generated from public/index.html — run: node scripts/embed.js */\nmodule.exports = " + JSON.stringify(h) + ";\n"
);
const dstHtml = path.join(dir, "embedded-index.html");
fs.writeFileSync(dstHtml, h, "utf8");
console.log("Wrote", dstJs);
console.log("Wrote", dstHtml);
