// Local dev server: serves the static site and the /api functions the same way Vercel does.
//   npm run dev        (needs ANTHROPIC_API_KEY)
//   npm run dev:mock   (demo data, no API calls)
import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import research from "./api/research.js";
import lead from "./api/lead.js";

const ROOT = path.resolve(".");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".json": "application/json" };
const routes = { "/api/research": research, "/api/lead": lead };

http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  const fn = routes[url.pathname];
  if (fn) {
    let raw = "";
    for await (const chunk of req) raw += chunk;
    try { req.body = raw ? JSON.parse(raw) : {}; } catch { req.body = {}; }
    res.status = (c) => { res.statusCode = c; return res; };
    res.json = (o) => { res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify(o)); };
    return fn(req, res);
  }
  let file = path.join(ROOT, decodeURIComponent(url.pathname));
  if (!file.startsWith(ROOT)) { res.statusCode = 403; return res.end(); }
  if (url.pathname.endsWith("/")) file = path.join(file, "index.html");
  try {
    const data = await fs.readFile(file);
    res.setHeader("Content-Type", TYPES[path.extname(file)] || "application/octet-stream");
    res.end(data);
  } catch {
    res.statusCode = 404; res.end("Not found");
  }
}).listen(process.env.PORT || 3000, () => console.log(`http://localhost:${process.env.PORT || 3000}${process.env.MOCK === "1" ? "  (mock mode)" : ""}`));
