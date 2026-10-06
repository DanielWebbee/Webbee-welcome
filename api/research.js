// POST /api/research  { step, ...inputs }  ->  step result JSON
// Steps run one at a time from the browser so each response stays well inside function limits.
import { STEPS } from "../lib/steps.js";
import { StepError } from "../lib/claude.js";
import { normalizeDomain } from "../lib/site.js";
import { MOCK } from "../lib/mock.js";

export const config = { maxDuration: 120 };

const RUNS_PER_HOUR = Number(process.env.RUNS_PER_IP_PER_HOUR || 5);
const CACHE_TTL = 24 * 3600 * 1000;
const runs = new Map();   // ip -> [timestamps]   (per instance; use a KV store for strict limits)
const cache = new Map();  // key -> {at, value}

function rateLimited(ip) {
  const now = Date.now();
  const list = (runs.get(ip) || []).filter(t => now - t < 3600_000);
  if (list.length >= RUNS_PER_HOUR) return true;
  list.push(now);
  runs.set(ip, list);
  return false;
}

function cacheKey(step, body) {
  if (step === "company") return `company:${body.domain}`;
  if (step === "competitors" || step === "segments") return `${step}:${body.company?.domain}`;
  if (step === "companies") return `companies:${body.company?.domain}:${body.segment?.id}`;
  if (step === "people") return `people:${body.company?.domain}:${body.segment?.id}`;
  return null;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
  if (JSON.stringify(body).length > 120_000) return res.status(413).json({ error: "Request too large" });

  const step = body.step;
  if (!Object.hasOwn(STEPS, step)) return res.status(400).json({ error: "Unknown step" });

  if (step === "company") {
    body.domain = normalizeDomain(body.domain);
    if (!body.domain) return res.status(400).json({ error: "Please enter a valid website, e.g. yourcompany.com" });
  } else if (!body.company?.domain) {
    return res.status(400).json({ error: "Missing company context" });
  }

  if (process.env.MOCK === "1") {
    await new Promise(r => setTimeout(r, 1200));
    return res.status(200).json(MOCK[step](body));
  }

  const key = cacheKey(step, body);
  const hit = key && cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL) return res.status(200).json(hit.value);

  const ip = String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "").split(",")[0].trim();
  if (step === "company" && rateLimited(ip)) {
    return res.status(429).json({ error: "You've run a few pilots already. Book a call and we'll build the full campaign with you." });
  }

  try {
    const value = await STEPS[step](body);
    if (key) cache.set(key, { at: Date.now(), value });
    return res.status(200).json(value);
  } catch (err) {
    console.error(`[research:${step}]`, err);
    const msg = err instanceof StepError ? err.message : "The research agent hit a snag. Please try again.";
    return res.status(502).json({ error: msg });
  }
}
