// POST /api/lead  { name, email, phone, company_domain, segment, notes, ... }
// Forwards a "talk to us" request to LEAD_WEBHOOK_URL (Make / Zapier / HubSpot / Slack workflow).
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  const b = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
  const clip = (v, n = 300) => String(v ?? "").trim().slice(0, n);

  const lead = {
    name: clip(b.name, 120),
    email: clip(b.email, 200),
    phone: clip(b.phone, 40),
    company_domain: clip(b.company_domain, 200),
    company_name: clip(b.company_name, 200),
    segment: clip(b.segment, 200),
    notes: clip(b.notes, 2000),
    stage: clip(b.stage, 40),
    pilot_summary: clip(b.pilot_summary, 4000),
    submitted_at: new Date().toISOString(),
    source: "webbee-pilot-tool",
  };
  const isVisit = lead.stage === "url_submitted" && lead.company_domain;
  if (!isVisit && (!lead.name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(lead.email))) {
    return res.status(400).json({ error: "Please add your name and a valid work email." });
  }

  const url = process.env.LEAD_WEBHOOK_URL;
  if (!url) {
    console.log("[lead]", JSON.stringify(lead));
    return res.status(200).json({ ok: true });
  }
  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(lead),
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) throw new Error(`Webhook ${r.status}`);
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("[lead]", err, JSON.stringify(lead));
    return res.status(502).json({ error: "Could not send right now. Please email us or book a call directly." });
  }
}
