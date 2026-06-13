/**
 * Set Upstash Redis env vars on a Render web service via Render API.
 *
 * Put these values in .env or secrets-for-render.txt, then run:
 *   npm run render:set-upstash
 */
const fs = require("fs");
const path = require("path");
const https = require("https");

function loadSecretsFromFile() {
  const p = process.env.RENDER_SECRETS_FILE || path.join(__dirname, "..", "secrets-for-render.txt");
  if (!fs.existsSync(p)) return;
  const raw = fs.readFileSync(p, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq < 1) continue;
    const k = t.slice(0, eq).trim();
    const v = t.slice(eq + 1).trim();
    if (k) process.env[k] = v;
  }
  console.log("Loaded secrets file:", p);
}

require("dotenv").config();
loadSecretsFromFile();

function reqJson(method, requestPath, bodyObj) {
  const body = bodyObj == null ? "" : JSON.stringify(bodyObj);
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: "api.render.com",
      port: 443,
      method,
      path: requestPath,
      headers: {
        Authorization: `Bearer ${(process.env.RENDER_API_KEY || "").trim()}`,
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(body ? { "Content-Length": Buffer.byteLength(body, "utf8") } : {}),
      },
    };
    const req = https.request(opts, (res) => {
      let chunks = "";
      res.on("data", (c) => (chunks += c));
      res.on("end", () => {
        let parsed = null;
        try {
          parsed = chunks ? JSON.parse(chunks) : null;
        } catch (_) {}
        resolve({ status: res.statusCode, raw: chunks, json: parsed });
      });
    });
    req.on("error", reject);
    if (body) req.write(body, "utf8");
    req.end();
  });
}

async function putEnvVar(serviceId, key, value) {
  const requestPath = `/v1/services/${encodeURIComponent(serviceId)}/env-vars/${encodeURIComponent(key)}`;
  const res = await reqJson("PUT", requestPath, { value });
  if (res.status < 200 || res.status >= 300) {
    const msg = (res.json && res.json.message) || res.raw || res.status;
    throw new Error(`${key}: HTTP ${res.status} ${msg}`);
  }
  console.log(`OK: ${key}`);
}

async function main() {
  const renderApiKey = (process.env.RENDER_API_KEY || "").trim();
  const serviceId = (process.env.RENDER_SERVICE_ID || "").trim();
  const upstashUrl = (process.env.UPSTASH_REDIS_REST_URL || "").trim().replace(/\/+$/, "");
  const upstashToken = (process.env.UPSTASH_REDIS_REST_TOKEN || "").trim();
  const stateKey = (process.env.UPSTASH_STATE_KEY || "qr-magic:app-state").trim() || "qr-magic:app-state";

  if (!renderApiKey || !serviceId) {
    console.error("Missing RENDER_API_KEY or RENDER_SERVICE_ID.");
    console.error("Put them in .env or secrets-for-render.txt first.");
    process.exit(1);
  }
  if (!upstashUrl || !upstashToken) {
    console.error("Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN.");
    console.error("Copy them from the Upstash Redis database details page.");
    process.exit(1);
  }

  await putEnvVar(serviceId, "UPSTASH_REDIS_REST_URL", upstashUrl);
  await putEnvVar(serviceId, "UPSTASH_REDIS_REST_TOKEN", upstashToken);
  await putEnvVar(serviceId, "UPSTASH_STATE_KEY", stateKey);

  console.log("");
  console.log("Render Upstash environment variables are set.");
  console.log("Deploy the app, then check /api/storage-health for storage: upstash.");
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
