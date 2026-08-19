/**
 * Reuse an existing Render PostgreSQL database for QR Magic.
 * The database URL is fetched through the Render API and is never printed.
 */
const fs = require("fs");
const path = require("path");
const https = require("https");

function loadSecretsFromFile() {
  const file = process.env.RENDER_SECRETS_FILE || path.join(__dirname, "..", "secrets-for-render.txt");
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const text = line.trim();
    if (!text || text.startsWith("#")) continue;
    const eq = text.indexOf("=");
    if (eq < 1) continue;
    const key = text.slice(0, eq).trim();
    const value = text.slice(eq + 1).trim();
    if (key && !process.env[key]) process.env[key] = value;
  }
}

require("dotenv").config();
loadSecretsFromFile();

function requestJson(method, requestPath, bodyValue) {
  const body = bodyValue == null ? "" : JSON.stringify(bodyValue);
  return new Promise((resolve, reject) => {
    const request = https.request(
      {
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
      },
      (response) => {
        let raw = "";
        response.on("data", (chunk) => (raw += chunk));
        response.on("end", () => {
          let json = null;
          try {
            json = raw ? JSON.parse(raw) : null;
          } catch (_) {}
          resolve({ status: response.statusCode, raw, json });
        });
      }
    );
    request.on("error", reject);
    if (body) request.write(body, "utf8");
    request.end();
  });
}

function requireSuccess(result, label) {
  if (result.status >= 200 && result.status < 300) return result.json;
  const message = (result.json && result.json.message) || result.raw || result.status;
  throw new Error(`${label}: HTTP ${result.status} ${message}`);
}

async function putEnvVar(serviceId, key, value) {
  const result = await requestJson(
    "PUT",
    `/v1/services/${encodeURIComponent(serviceId)}/env-vars/${encodeURIComponent(key)}`,
    { value }
  );
  requireSuccess(result, key);
  console.log(`OK: ${key}`);
}

async function resolvePostgresId() {
  const configured = (process.env.RENDER_POSTGRES_ID || "").trim();
  if (configured) return configured;
  const rows = requireSuccess(await requestJson("GET", "/v1/postgres?limit=100"), "List PostgreSQL");
  const available = rows
    .map((row) => row.postgres || row)
    .filter((database) => database && database.status === "available");
  if (available.length !== 1) {
    throw new Error("Set RENDER_POSTGRES_ID because exactly one available PostgreSQL database was not found.");
  }
  return available[0].id;
}

async function main() {
  const apiKey = (process.env.RENDER_API_KEY || "").trim();
  const serviceId = (process.env.RENDER_SERVICE_ID || "").trim();
  if (!apiKey || !serviceId) {
    throw new Error("Missing RENDER_API_KEY or RENDER_SERVICE_ID in secrets-for-render.txt.");
  }

  const postgresId = await resolvePostgresId();
  const info = requireSuccess(
    await requestJson("GET", `/v1/postgres/${encodeURIComponent(postgresId)}/connection-info`),
    "PostgreSQL connection info"
  );
  const databaseUrl = String(info.internalConnectionString || info.externalConnectionString || "").trim();
  if (!databaseUrl) throw new Error("Render did not return a PostgreSQL connection string.");

  await putEnvVar(serviceId, "DATABASE_URL", databaseUrl);
  console.log("Render PostgreSQL environment is set. The connection string was not printed.");
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
