// Fetches a prospect's public website and extracts readable text for the research step.
// Guards against SSRF: only public http(s) hosts, re-checked on every redirect.
import dns from "node:dns/promises";
import net from "node:net";

const MAX_BYTES = 1_500_000;
const PAGE_CHARS = 6000;
const TIMEOUT_MS = 8000;
const UA = "Mozilla/5.0 (compatible; WebbeeResearchBot/1.0; +https://webbee.digital)";
const INTERESTING = /(about|company|product|platform|solution|service|pricing|customer|case-stud|industr|why|אודות|עלינו|שירות|מוצר|לקוחות|פתרונות)/i;

export function normalizeDomain(input) {
  const raw = String(input || "").trim().toLowerCase();
  const host = raw.replace(/^https?:\/\//, "").replace(/^www\./, "").split(/[/?#]/)[0];
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(host) || host.length > 253) return null;
  return host;
}

function isPrivateIp(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127) || a >= 224;
  }
  const v = ip.toLowerCase();
  if (v.startsWith("::ffff:")) return isPrivateIp(v.slice(7));
  return v === "::1" || v === "::" || v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe80");
}

async function assertPublicHost(hostname) {
  const addrs = await dns.lookup(hostname, { all: true });
  if (!addrs.length || addrs.some(a => isPrivateIp(a.address))) throw new Error("Host is not public");
}

async function safeFetch(url, redirects = 3) {
  const u = new URL(url);
  if (!/^https?:$/.test(u.protocol)) throw new Error("Bad protocol");
  await assertPublicHost(u.hostname);
  const res = await fetch(u, {
    redirect: "manual",
    headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml" },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
    if (redirects <= 0) throw new Error("Too many redirects");
    return safeFetch(new URL(res.headers.get("location"), u).toString(), redirects - 1);
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  if (!/html|xml|text/i.test(res.headers.get("content-type") || "")) throw new Error("Not HTML");
  const reader = res.body.getReader();
  const chunks = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > MAX_BYTES) { reader.cancel(); break; }
    chunks.push(value);
  }
  return { url: res.url || u.toString(), html: Buffer.concat(chunks).toString("utf8") };
}

const decode = s => s
  .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
  .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n));

function extract(html) {
  const title = decode((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || "").trim();
  const meta = decode((html.match(/<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)/i) || [])[1] || "").trim();
  const text = decode(html
    .replace(/<(script|style|noscript|svg|iframe)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<\/(p|div|li|h[1-6]|section|br|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, " "))
    .replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n").trim();
  return { title, meta, text: text.slice(0, PAGE_CHARS) };
}

const safeDecode = (p) => { try { return decodeURIComponent(p); } catch { return p; } };

function internalLinks(html, base) {
  const out = new Set();
  const host = new URL(base).hostname.replace(/^www\./, "");
  for (const m of html.matchAll(/<a[^>]+href=["']([^"'#]+)["']/gi)) {
    try {
      const u = new URL(m[1], base);
      if (u.hostname.replace(/^www\./, "") === host && INTERESTING.test(safeDecode(u.pathname))) out.add(u.origin + u.pathname);
    } catch { /* ignore malformed hrefs */ }
  }
  return [...out].slice(0, 3);
}

// Returns [{url, title, meta, text}] for the homepage plus up to 3 relevant internal pages.
export async function readSite(domain) {
  const home = await safeFetch(`https://${domain}`).catch(() => safeFetch(`http://${domain}`));
  const pages = [{ url: home.url, ...extract(home.html) }];
  const extra = await Promise.allSettled(internalLinks(home.html, home.url).map(safeFetch));
  for (const r of extra) if (r.status === "fulfilled") pages.push({ url: r.value.url, ...extract(r.value.html) });
  return pages;
}
