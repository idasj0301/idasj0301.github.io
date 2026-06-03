import { createReadStream } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import http from "node:http";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const rootDir = resolve(__dirname, "..");
const distDir = resolve(process.env.SITE_DIST_DIR ?? join(rootDir, "dist"));
const port = Number(process.env.PORT ?? 4322);
const host = process.env.HOST ?? "127.0.0.1";
const webhookUrl = (process.env.WECOM_SMARTSHEET_WEBHOOK_URL ?? "").trim();
const publicSiteUrl = (process.env.PUBLIC_SITE_URL ?? process.env.SITE ?? "").trim();
const maxBodyBytes = 32 * 1024;

const schema = {
  f04Gwj: "提交时间",
  ftQMc5: "称呼",
  ftk5Tx: "手机或微信",
  ffFwIh: "感兴趣方向",
  fn8TJd: "咨询航线",
  fq59b4: "行程链接",
  fTFMDA: "来源页面",
  fmgEcn: "补充说明",
  fJdMPk: "跟进状态",
  fpMreQ: "跟进人",
  fbjQKk: "跟进备注",
};

const interestOptions = new Set(["南极", "北极", "加拉帕戈斯", "南部非洲", "东非", "南美"]);

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webp": "image/webp",
  ".xml": "application/xml; charset=utf-8",
};

function sendJson(res, status, data) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(data));
}

function cleanText(value, maxLength = 500) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function textValue(value, maxLength) {
  return cleanText(value, maxLength);
}

function optionValue(value) {
  const text = cleanText(value, 40);
  return text && interestOptions.has(text) ? [{ text }] : [];
}

function buildTripLink(lead) {
  const title = cleanText(lead.tripTitle, 200) || "查看行程";
  const slug = cleanText(lead.tripSlug, 300);
  const pageUrl = cleanText(lead.pageUrl, 600);

  if (slug && publicSiteUrl) {
    return [{ text: title, link: new URL(`/trips/${slug}`, publicSiteUrl).toString() }];
  }
  if (pageUrl) {
    return [{ text: title, link: pageUrl }];
  }
  return [];
}

function buildSmartsheetPayload(lead, req) {
  const submittedAtMs = Date.parse(lead.submittedAt ?? "") || Date.now();
  const sourcePage = cleanText(lead.pageUrl || req.headers.referer || lead.source || "官网预约表单", 600);

  return {
    schema,
    add_records: [
      {
        values: {
          f04Gwj: String(submittedAtMs),
          ftQMc5: textValue(lead.name, 80),
          ftk5Tx: textValue(lead.contact, 120),
          ffFwIh: optionValue(lead.interest),
          fn8TJd: textValue(lead.tripTitle, 200),
          fq59b4: buildTripLink(lead),
          fTFMDA: sourcePage,
          fmgEcn: textValue(lead.note, 1000),
          fJdMPk: [{ text: "新线索" }],
        },
      },
    ],
  };
}

async function readJsonBody(req) {
  let size = 0;
  const chunks = [];

  for await (const chunk of req) {
    size += chunk.length;
    if (size > maxBodyBytes) {
      throw new Error("payload_too_large");
    }
    chunks.push(chunk);
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

async function handleLead(req, res) {
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }
  if (req.method !== "POST") {
    sendJson(res, 405, { ok: false, error: "method_not_allowed" });
    return;
  }
  if (!webhookUrl) {
    sendJson(res, 500, { ok: false, error: "missing_wecom_webhook" });
    return;
  }

  let lead;
  try {
    lead = await readJsonBody(req);
  } catch {
    sendJson(res, 400, { ok: false, error: "invalid_json" });
    return;
  }

  if (!cleanText(lead.name, 80) || !cleanText(lead.contact, 120)) {
    sendJson(res, 400, { ok: false, error: "missing_required_fields" });
    return;
  }

  const payload = buildSmartsheetPayload(lead, req);
  let upstream;
  try {
    upstream = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    sendJson(res, 502, { ok: false, error: "wecom_unreachable" });
    return;
  }

  let result;
  try {
    result = await upstream.json();
  } catch {
    sendJson(res, 502, { ok: false, error: "wecom_invalid_response" });
    return;
  }

  if (!upstream.ok || result.errcode !== 0) {
    sendJson(res, 502, { ok: false, error: "wecom_rejected", detail: result.errmsg ?? result.errcode });
    return;
  }

  sendJson(res, 200, {
    ok: true,
    recordId: result.add_records?.[0]?.record_id ?? null,
  });
}

async function findStaticFile(pathname) {
  const decoded = decodeURIComponent(pathname);
  const safePath = normalize(decoded).replace(/^(\.\.[/\\])+/, "");
  const directPath = resolve(distDir, `.${safePath}`);

  if (!directPath.startsWith(distDir)) {
    return null;
  }

  const candidates = [];
  if (decoded === "/") {
    candidates.push(resolve(distDir, "index.html"));
  } else {
    candidates.push(directPath);
    candidates.push(resolve(directPath, "index.html"));
  }

  for (const filePath of candidates) {
    try {
      const info = await stat(filePath);
      if (info.isFile()) return filePath;
    } catch {
      /* try next candidate */
    }
  }

  return null;
}

async function serveStatic(res, pathname) {
  const filePath = await findStaticFile(pathname);
  if (!filePath) {
    const notFoundPath = resolve(distDir, "404.html");
    try {
      const html = await readFile(notFoundPath, "utf8");
      res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
      res.end(html);
    } catch {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found");
    }
    return;
  }

  const type = mimeTypes[extname(filePath).toLowerCase()] ?? "application/octet-stream";
  res.writeHead(200, { "Content-Type": type });
  createReadStream(filePath).pipe(res);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);

  try {
    if (url.pathname === "/api/lead") {
      await handleLead(req, res);
      return;
    }
    await serveStatic(res, url.pathname);
  } catch (error) {
    console.error(error);
    sendJson(res, 500, { ok: false, error: "server_error" });
  }
});

server.listen(port, host, () => {
  console.log(`Lead server listening on http://${host}:${port}`);
});
