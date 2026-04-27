/**
 * Render の「Deploy hook」を1回 POST するだけで再デプロイ。
 * .env に RENDER_DEPLOY_HOOK=（Render が表示したURL）を書いてから:
 *   npm run deploy
 */
require("dotenv").config();
const https = require("https");
const http = require("http");

const url = (process.env.RENDER_DEPLOY_HOOK || "").trim();
if (!url) {
  console.error("Missing RENDER_DEPLOY_HOOK in .env");
  console.error("Render dashboard → your service → Settings → Deploy Hook → copy URL into .env");
  process.exit(1);
}

const u = new URL(url);
const lib = u.protocol === "https:" ? https : http;
const opts = {
  method: "POST",
  hostname: u.hostname,
  path: u.pathname + u.search,
  headers: { "Content-Length": "0" },
};

const req = lib.request(opts, (res) => {
  let body = "";
  res.on("data", (c) => (body += c));
  res.on("end", () => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      console.log("Deploy triggered OK (HTTP", res.statusCode + ")");
      if (body) console.log(body);
    } else {
      console.error("Failed:", res.statusCode, body || "");
      process.exit(1);
    }
  });
});
req.on("error", (e) => {
  console.error(e.message || e);
  process.exit(1);
});
req.end();
