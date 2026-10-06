/* Webbee LinkedIn pilot campaign: 6-step research flow.
   Each step calls /api/research and renders its result; the run is cached per domain in sessionStorage. */
(() => {
  "use strict";

  const CONFIG = {
    bookingUrl: "https://webbee.digital/contact", // TODO: Calendly / booking link
    autoAdvanceMs: 4500,
    // Shown while a step is running. Edit freely; keep claims accurate.
    interstitials: [
      { vs: [["Webbee pilot", "Free", "to see your campaign"], ["In-house SDR", "$5,000+", "per month, before tools"]], text: "We just did in minutes what an SDR spends their first week on: learning your product and market." },
      { big: "15+ years", small: "running B2B growth for tech companies", text: "Our team lives in LinkedIn outreach. Every message follows a playbook tested across hundreds of campaigns." },
      { big: "14 days", small: "from kickoff to your first messages going out", text: "No hiring, training or tooling on your side. A dedicated SDR runs the whole thing." },
      { vs: [["LinkedIn DM", "1:1", "personal, researched"], ["Cold email blast", "1:many", "generic, filtered"]], text: "Decision-makers answer people, not templates. That's why we lead with LinkedIn." },
      { big: "You", small: "only show up to qualified meetings", text: "We handle the research, the messages, the replies and the follow-ups." },
      { big: "Real", small: "companies, real decision-makers", text: "Everything you see is pulled from live public sources for your market, not a canned demo." },
    ],
  };

  const STEPS = [
    { key: "company", title: "Research your company", lines: d => [`fetching ${d}...`, "reading key pages...", "extracting what you sell and to whom...", "building the company profile..."] },
    { key: "competitors", title: "Explore competitors", lines: () => ["listing your product categories...", "searching for alternatives buyers compare...", "checking candidates...", "ranking the closest competitors..."] },
    { key: "segments", title: "Define campaigns", lines: () => ["clustering use cases...", "matching pains to buyers...", "scoring campaign ideas..."] },
    { key: "companies", title: "Find potential customers", lines: s => [`building search queries for "${s}"...`, "searching live sources for matching companies...", "verifying domains and fit...", "spotting buying signals..."] },
    { key: "people", title: "Find decision makers", lines: () => ["picking the best-fit companies...", "finding decision makers on LinkedIn...", "verifying names against public profiles..."] },
    { key: "message", title: "Write LinkedIn messages", lines: () => ["picking the hottest lead...", "reading their company signals...", "drafting the LinkedIn sequence...", "applying Webbee copy rules..."] },
  ];

  // ---------- helpers ----------
  const $ = (s, el = document) => el.querySelector(s);
  const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fav = d => `https://www.google.com/s2/favicons?domain=${encodeURIComponent(d)}&sz=64`;
  const img = (d, cls = "") => `<img class="${cls}" src="${fav(d)}" alt="" loading="lazy" onerror="this.style.visibility='hidden'">`;
  const initials = (a, b) => ((a || "")[0] || "") + ((b || "")[0] || "");
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const store = {
    get(k) { try { return JSON.parse(sessionStorage.getItem(k)); } catch { return null; } },
    set(k, v) { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch { /* storage unavailable */ } },
  };
  const normalizeDomain = v => {
    const h = String(v || "").trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").split(/[/?#]/)[0];
    return /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(h) ? h : null;
  };

  async function api(path, body) {
    const r = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    let data = {};
    try { data = await r.json(); } catch { /* non-JSON error */ }
    if (!r.ok) throw new Error(data.error || "Something went wrong. Please try again.");
    return data;
  }

  // ---------- state ----------
  const domain = normalizeDomain(new URLSearchParams(location.search).get("site"));
  const KEY = `webbee-pilot:${domain}`;
  const S = Object.assign({
    domain, company: null, competitors: null, segments: null, segmentId: null,
    companies: {}, people: {}, messages: {}, personIdx: 0, reached: 0,
  }, (domain && store.get(KEY)) || {});
  const save = () => store.set(KEY, S);
  const seg = () => S.segments?.segments.find(s => s.id === S.segmentId) || S.segments?.segments[0];
  let current = 0;      // step being worked on (1-6)
  let runToken = 0;     // increments when a run is superseded (e.g. segment switch)

  // ---------- stepper ----------
  function renderStepper(active, idle) {
    $("#stepper").innerHTML = STEPS.map((s, i) => {
      const n = i + 1;
      const cls = n < active || (n <= S.reached && n !== active) ? "done" : n === active ? "active" + (idle ? " idle" : "") : "";
      return `<div class="st ${cls}" data-n="${n}">
        <span class="dot" ${cls === "done" ? `role="button" tabindex="0" title="${esc(s.title)}"` : ""}>${n}</span>
        <span class="label"><i></i>${n} ${esc(s.title)}</span>
        ${n < STEPS.length ? '<span class="bar"></span>' : ""}
      </div>`;
    }).join("");
  }
  $("#stepper").addEventListener("click", e => {
    const st = e.target.closest(".st.done");
    if (st) showResult(+st.dataset.n);
  });

  // ---------- agent log ----------
  const log = $("#log");
  function logStart(n, lines) {
    log.querySelectorAll(".head:not(.done)").forEach(h => h.remove());
    const box = document.createElement("div");
    box.dataset.step = n;
    box.innerHTML = `<div class="head"><i></i>Webbee agent is working on step ${n} of 6</div><div class="lines"></div>`;
    log.appendChild(box);
    const linesEl = $(".lines", box);
    let i = 0, stopped = false;
    const tick = () => {
      if (stopped || i >= lines.length) return;
      linesEl.querySelectorAll(".cur").forEach(l => l.className = "line ok");
      const l = document.createElement("div");
      l.className = "line cur";
      l.textContent = lines[i++];
      linesEl.appendChild(l);
      $("#mobileLog").textContent = "› " + l.textContent;
      if (i < lines.length) setTimeout(tick, 1500 + Math.random() * 900);
    };
    tick();
    box.scrollIntoView({ block: "end", behavior: "smooth" });
    return {
      done(summaryHtml) {
        stopped = true;
        box.innerHTML = `<div class="head done"><i></i>step ${n} · ${esc(STEPS[n - 1].title)}</div>${summaryHtml ? `<div class="side-card fade-in">${summaryHtml}</div>` : ""}`;
        $("#mobileLog").textContent = `✓ step ${n} · ${STEPS[n - 1].title}`;
      },
      fail() { stopped = true; box.remove(); },
    };
  }

  function sideSummary(n) {
    if (n === 1) {
      const c = S.company;
      return `<div class="side-co">${img(c.domain)}<div><b>${esc(c.name)}</b><span>${esc(c.domain)}</span></div></div>
        <div style="color:var(--ink-2);font-size:12.5px">${esc(c.one_liner)}</div>`;
    }
    if (n === 2) {
      return `<div class="t">Competitors · ${S.competitors.competitors.length}</div><div class="fav-grid">${
        S.competitors.competitors.slice(0, 6).map(c => `<div class="fav">${img(c.domain)}<span>${esc(c.domain)}</span></div>`).join("")}</div>`;
    }
    if (n === 3) {
      return `<div class="t">Campaigns · ${S.segments.segments.length}</div><div class="seg-list">${
        S.segments.segments.map(s => `<button data-seg="${esc(s.id)}" class="${s.id === seg().id ? "on" : ""}"><span>${esc(s.name)}</span><small>${esc(s.est_accounts)}</small></button>`).join("")}</div>`;
    }
    if (n === 4) return `<div class="t">Companies found · ${S.companies[seg().id].length}</div>`;
    if (n === 5) {
      const p = S.people[seg().id];
      return `<div class="t">Decision makers · ${p.length}</div><div style="font-size:12.5px;color:var(--ink-2)">${esc([...new Set(p.map(x => x.title))].slice(0, 3).join(" · "))}</div>`;
    }
    return `<div class="t">Sequence ready</div><div style="font-size:12.5px;color:var(--ink-2)">Blank connection request + 3 messages</div>`;
  }
  log.addEventListener("click", e => {
    const b = e.target.closest("[data-seg]");
    if (b) chooseSegment(b.dataset.seg);
  });

  // ---------- stage views ----------
  const stage = $("#stage");
  const show = html => { stage.innerHTML = `<div class="fade-in">${html}</div>`; window.scrollTo({ top: 0, behavior: "smooth" }); };

  function interstitial(n) {
    const it = CONFIG.interstitials[(n - 1) % CONFIG.interstitials.length];
    const top = it.vs
      ? `<div class="vs">${it.vs.map(([lbl, num, small], i) => `<div><div class="lbl">${i === 0 ? '<svg><use href="#hex"/></svg>' : '<svg><use href="#user"/></svg>'}${esc(lbl)}</div><div class="n ${i ? "mut" : ""}">${esc(num)}</div><small>${esc(small)}</small></div>${i === 0 ? "<em>vs</em>" : ""}`).join("")}</div>`
      : `<div class="big">${esc(it.big)}<small>${esc(it.small)}</small></div>`;
    show(`<div class="wait"><div class="card">${top}<p>${esc(it.text)}</p><div class="progress"><i></i></div></div></div>`);
  }

  function viewCompany() {
    const c = S.company;
    const facts = [["Founded", c.founded], ["Team", c.employees_estimate], ["HQ", c.hq], ["Market", c.target_market]].filter(f => f[1]);
    return `<div class="card company">
      <div class="top">${img(c.domain)}<div><b>${esc(c.name)}</b><span>${esc(c.domain)}</span></div><span class="found">✓ Found</span></div>
      <div class="desc">${esc(c.description)}</div>
      ${facts.length ? `<div class="facts">${facts.map(([k, v]) => `<div class="fact"><small>${k}</small>${esc(v)}</div>`).join("")}</div>` : ""}
      ${c.value_props?.length ? `<div class="k">Why customers buy</div><ul class="bullets">${c.value_props.map(v => `<li>${esc(v)}</li>`).join("")}</ul>` : ""}
      ${c.proof_points?.length ? `<div class="k">Proof points</div><ul class="bullets">${c.proof_points.map(v => `<li>${esc(v)}</li>`).join("")}</ul>` : ""}
      ${c.keywords?.length ? `<div class="k">Keywords</div><div class="tags">${c.keywords.map(k => `<span class="tag">${esc(k)}</span>`).join("")}</div>` : ""}
    </div>`;
  }

  function viewCompetitors() {
    const c = S.competitors;
    return `<div class="card comp">
      <div>
        <div class="k" style="margin-top:0">Product</div>
        <div class="prod"><b>${esc(S.company.category || S.company.name)}</b>${c.product_summary.map(l => `<div style="font-size:13px;color:var(--ink-2)">${esc(l)}</div>`).join("")}</div>
        <div class="k">Queries</div>
        ${c.search_queries.map(q => `<div class="query"><svg><use href="#search"/></svg>${esc(q)}</div>`).join("")}
      </div>
      <div class="comp-list">
        <div class="k" style="margin-top:0;display:flex;align-items:center;gap:8px">Competitors <span class="found">✓ ${c.competitors.length} found</span></div>
        ${c.competitors.map(x => `<div class="row">${img(x.domain)}<b>${esc(x.domain)}</b><span>${esc(x.note)}</span></div>`).join("")}
      </div>
    </div>`;
  }

  function scoreRing(v) {
    const r = 15, c = 2 * Math.PI * r, off = c * (1 - Math.max(0, Math.min(100, v)) / 100);
    return `<div class="score"><svg viewBox="0 0 38 38"><circle cx="19" cy="19" r="${r}" fill="none" stroke="#ece8e3" stroke-width="3.5"/><circle cx="19" cy="19" r="${r}" fill="none" stroke="url(#hg)" stroke-width="3.5" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${off}"/></svg><span>${v}%</span></div>`;
  }

  function viewSegments() {
    const active = seg().id;
    return `<h2>Pick a campaign to pilot</h2><div class="sub">We ranked ${S.segments.segments.length} LinkedIn campaigns by fit. Click any to find its customers.</div>
      <div class="segs">${S.segments.segments.map(s => `
      <div class="card seg ${s.id === active ? "on" : ""}" data-seg="${esc(s.id)}" role="button" tabindex="0">
        <div class="h"><b>${esc(s.name)}</b>${scoreRing(+s.fit_score || 0)}</div>
        <div class="hl">${esc(s.headline)}</div>
        <div class="k">Pain</div><div style="font-size:13.5px;color:var(--ink-2)">${esc(s.pain)}</div>
        <div class="k">Criteria</div><ul>${s.criteria.map(c => `<li>${esc(c)}</li>`).join("")}</ul>
        <div class="tags">${s.titles.map(t => `<span class="tag">${esc(t)}</span>`).join("")}<span class="tag" style="background:none;color:var(--muted)">~${esc(s.est_accounts)} accounts</span></div>
      </div>`).join("")}</div>`;
  }
  stage.addEventListener("click", e => {
    const card = e.target.closest(".seg[data-seg]");
    if (card) chooseSegment(card.dataset.seg);
    const p = e.target.closest(".pcard[data-i]");
    if (p) choosePerson(+p.dataset.i);
    if (e.target.closest(".js-copy")) copySequence(e.target.closest(".js-copy"));
  });

  function viewCompanies() {
    const list = S.companies[seg().id];
    return `<h2>${list.length} companies that fit "${esc(seg().name)}"</h2><div class="sub">Found in live public sources and checked against your campaign criteria.</div>
      <div class="card table-wrap"><table><thead><tr><th>Company</th><th>Description</th><th>Location</th><th>Size</th><th>Signal</th></tr></thead><tbody>
      ${list.map((c, i) => `<tr style="animation-delay:${i * 60}ms"><td><div class="co-cell">${img(c.domain)}<div><b>${esc(c.name)}</b><span>${esc(c.domain)}</span></div></div></td>
        <td class="desc-cell">${esc(c.description)}</td><td>${esc(c.location)}</td><td>${esc(c.size)}</td>
        <td>${c.signal ? `<span class="signal">${esc(c.signal)}</span>` : ""}</td></tr>`).join("")}
      </tbody></table></div>`;
  }


  function viewPeople() {
    const list = S.people[seg().id];
    const anyVerified = list.some(p => p.verified);
    return `<h2>Decision makers we'd message</h2><div class="sub">${anyVerified ? "Verified against public LinkedIn profiles. Full names and profiles are shared when we talk." : "The roles we'd target at each account. Named contacts are shared when we talk."}</div>
      <div class="card table-wrap"><table><thead><tr><th>Name</th><th>Job title</th><th>Company</th><th>Location</th><th>Why them</th></tr></thead><tbody>
      ${list.map((p, i) => `<tr style="animation-delay:${i * 60}ms">
        <td><div class="person-cell"><span class="avatar ${p.verified ? "" : "ghost"}">${esc(initials(p.first_name, p.last_initial) || "?")}</span><div>${p.verified ? esc(p.first_name) + ' <span class="blur">' + esc(p.last_initial || "X") + 'xxxxx</span><span class="li">in</span>' : '<span class="lock">🔒 Unlocked on a call</span>'}</div></div></td>
        <td>${esc(p.title)}</td><td><div class="co-cell" style="min-width:0">${img(p.company_domain)}<b>${esc(p.company_name)}</b></div></td>
        <td>${esc(p.location)}</td><td class="desc-cell">${esc(p.why)}</td></tr>`).join("")}
      </tbody></table></div>`;
  }

  function threadHtml(p, m) {
    const fname = p.verified ? p.first_name : "";
    const fill = t => esc(String(t || "").replace(/\{first_name\}/g, fname || "{first_name}"));
    const steps = m ? [
      ["Day 0", "Connect", `<div class="bubble note">Connection request sent <b>without a note</b>. Blank requests get accepted more often, and the conversation starts once they say yes.</div>`],
      ["Day 1", "After accept", `<div class="bubble">${fill(m.msg1)}</div>`],
      ["Day 4", "Follow-up", `<div class="bubble">${fill(m.msg2)}</div>`],
      ["Day 8", "The ask", `<div class="bubble">${fill(m.msg3)}</div>`],
    ] : [["Day 0", "Connect", `<div class="bubble typing">Writing a personal sequence for ${esc(fname || p.title)}</div>`]];
    return `<div class="card thread">
      <div class="who"><span class="avatar ${p.verified ? "" : "ghost"}">${esc(initials(p.first_name, p.last_initial) || "?")}</span>
        <div><b>${p.verified ? esc(p.first_name) + ' <span class="blur">' + esc(p.last_initial || "X") + 'xxxxx</span><span class="li">in</span>' : esc(p.title)}</b><span>${esc(p.title)} · ${esc(p.company_name)}</span></div></div>
      ${steps.map(([d, w, b]) => `<div class="seqstep"><div class="when">${d}<small>${w}</small></div><div>${b}</div></div>`).join("")}
      ${m ? `<div class="foot"><small>${m.signals_used?.length ? "Personalized with: " + esc(m.signals_used.join(" · ")) : "Written to Webbee's LinkedIn playbook"}</small>
        <button class="btn btn-ghost js-copy"><svg><use href="#copy"/></svg>Copy</button>
        <button class="btn btn-red js-talk">Launch this campaign <svg><use href="#arrow"/></svg></button></div>` : ""}
    </div>`;
  }

  function viewMessages() {
    const list = S.people[seg().id];
    const p = list[S.personIdx] || list[0];
    const m = S.messages[`${seg().id}:${S.personIdx}`];
    return `<h2>Your LinkedIn sequence</h2><div class="sub">Written for each decision maker, following the playbook our SDRs use every day. Click a person to rewrite it for them.</div>
      <div class="msg-layout">
        <div class="plist">${list.map((x, i) => `<button class="pcard ${i === S.personIdx ? "on" : ""}" data-i="${i}">
          <span class="avatar ${x.verified ? "" : "ghost"}">${esc(initials(x.first_name, x.last_initial) || "?")}</span>
          <div><b>${x.verified ? esc(x.first_name) + " " + esc(x.last_initial) + "." : esc(x.title)}</b><span>${esc(x.title)} · ${esc(x.company_name)}</span></div></button>`).join("")}</div>
        <div id="thread">${threadHtml(p, m)}</div>
      </div>
      <div class="whatnext">
        <div class="card wn"><div class="n">7</div><b>Launch on LinkedIn</b><p>A dedicated Webbee SDR sends this sequence to every decision maker in the campaign.</p></div>
        <div class="card wn"><div class="n">8</div><b>Book meetings</b><p>We handle replies and objections and put qualified meetings on your calendar.</p></div>
        <div class="card wn"><div class="n">9</div><b>Learn and double down</b><p>Weekly reporting. We scale the campaigns that convert and pause the rest.</p></div>
      </div>
      <div class="card final-cta"><div><h3>Want us to run this pilot for you?</h3><p>Talk to a Webbee strategist. We'll walk you through the full list and launch in 14 days.</p></div>
        <button class="btn btn-red js-talk">Talk to us <svg><use href="#arrow"/></svg></button></div>`;
  }

  const VIEWS = [viewCompany, viewCompetitors, viewSegments, viewCompanies, viewPeople, viewMessages];

  function showResult(n, withNext) {
    const nextBtn = withNext && n < 6
      ? `<div class="next-row"><button class="btn btn-dark" id="nextBtn">Next: ${esc(STEPS[n].title)} <svg><use href="#arrow"/></svg></button></div>` : "";
    show(VIEWS[n - 1]() + nextBtn);
  }

  // Waits for the user to click "Next" or for the auto-advance timer.
  function waitNext(token) {
    return new Promise(resolve => {
      const btn = $("#nextBtn");
      const t = setTimeout(() => resolve(true), CONFIG.autoAdvanceMs);
      if (btn) btn.onclick = () => { clearTimeout(t); resolve(true); };
    }).then(() => token === runToken);
  }

  // ---------- running steps ----------
  const has = {
    1: () => S.company, 2: () => S.competitors, 3: () => S.segments,
    4: () => S.companies[seg()?.id], 5: () => S.people[seg()?.id], 6: () => S.messages[`${seg()?.id}:${S.personIdx}`],
  };

  async function runStepN(n, token) {
    current = n;
    renderStepper(n, false);
    if (n >= 3 && S.segments) $("#ctaBar").classList.add("on");
    const cached = has[n]();
    const lines = STEPS[n - 1].lines(n === 4 ? seg().name : domain);
    const lg = logStart(n, cached ? [] : lines);
    if (!cached) {
      if (n === 6) showResult(6); else interstitial(n);
      const body = { step: STEPS[n - 1].key, domain };
      if (n > 1) body.company = S.company;
      if (n === 3) body.competitors = S.competitors;
      if (n >= 4) body.segment = seg();
      if (n === 5) body.companies = S.companies[seg().id];
      if (n === 6) {
        const p = S.people[seg().id][S.personIdx];
        body.person = p;
        body.targetCompany = S.companies[seg().id].find(c => c.domain === p.company_domain) || null;
      }
      let data;
      try {
        data = await api("/api/research", body);
      } catch (err) {
        if (token !== runToken) return false;
        lg.fail();
        showError(err.message, n);
        return false;
      }
      if (token !== runToken) return false;
      if (n === 1) S.company = data;
      if (n === 2) S.competitors = data;
      if (n === 3) { S.segments = data; S.segmentId = data.segments[0]?.id; }
      if (n === 4) S.companies[seg().id] = data.companies;
      if (n === 5) S.people[seg().id] = data.people;
      if (n === 6) S.messages[`${seg().id}:${S.personIdx}`] = data;
      save();
    }
    lg.done(sideSummary(n));
    S.reached = Math.max(S.reached, n);
    save();
    renderStepper(n, true);
    if (n === 3) $("#ctaBar").classList.add("on");
    return true;
  }

  async function run(fromStep = 1) {
    const token = ++runToken;
    for (let n = fromStep; n <= 6; n++) {
      const replay = !!has[n]();
      const ok = await runStepN(n, token);
      if (!ok || token !== runToken) return;
      showResult(n, n < 6);
      if (n < 6 && !(replay && has[n + 1]())) {
        if (!(await waitNext(token))) return;
      }
    }
  }

  function chooseSegment(id) {
    if (!S.segments || (id === S.segmentId && current >= 4)) return;
    S.segmentId = id;
    S.personIdx = 0;
    save();
    // Refresh the campaign list in the log, drop steps 4-6 and re-run them for the new segment.
    log.querySelectorAll("[data-step]").forEach(b => { if (+b.dataset.step >= 4) b.remove(); });
    const card = log.querySelector('[data-step="3"] .side-card');
    if (card) card.innerHTML = sideSummary(3);
    run(4);
  }

  async function choosePerson(i) {
    if (i === S.personIdx && has[6]()) return;
    S.personIdx = i;
    save();
    document.querySelectorAll(".pcard").forEach(b => b.classList.toggle("on", +b.dataset.i === i));
    const token = ++runToken;
    const p = S.people[seg().id][i];
    const key = `${seg().id}:${i}`;
    if (!S.messages[key]) {
      $("#thread").innerHTML = threadHtml(p, null);
      try {
        S.messages[key] = await api("/api/research", {
          step: "message", company: S.company, segment: seg(), person: p,
          targetCompany: S.companies[seg().id].find(c => c.domain === p.company_domain) || null,
        });
        save();
      } catch (err) {
        if (token === runToken) $("#thread").innerHTML = `<div class="card thread"><p>${esc(err.message)}</p></div>`;
        return;
      }
    }
    if (token === runToken && $("#thread")) $("#thread").innerHTML = threadHtml(p, S.messages[key]);
  }

  function copySequence(btn) {
    const p = S.people[seg().id][S.personIdx];
    const m = S.messages[`${seg().id}:${S.personIdx}`];
    if (!m) return;
    const name = p.verified ? p.first_name : "{first_name}";
    const text = ["Connection request: (no note)", "", "Message 1:", m.msg1, "", "Message 2:", m.msg2, "", "Message 3:", m.msg3].join("\n").replace(/\{first_name\}/g, name);
    navigator.clipboard?.writeText(text).then(() => {
      const old = btn.innerHTML;
      btn.textContent = "Copied ✓";
      setTimeout(() => { btn.innerHTML = old; }, 1600);
    }).catch(() => {});
  }

  function showError(msg, n) {
    renderStepper(n, true);
    show(`<div class="card err"><h2>We hit a snag</h2><p>${esc(msg)}</p>
      <div class="next-row"><button class="btn btn-dark" id="retryBtn">Try again</button><button class="btn btn-red js-talk">Talk to us instead</button></div></div>`);
    $("#retryBtn").onclick = () => run(n);
  }

  function showStart() {
    $("#ctaBar").classList.remove("on");
    renderStepper(0, false);
    show(`<div class="start"><h1>Your LinkedIn pilot campaign, <span style="background:var(--grad);-webkit-background-clip:text;background-clip:text;color:transparent">free</span></h1>
      <p>Paste your website. Our agent researches your market, finds the decision makers and writes the LinkedIn messages.</p>
      <form class="url-form" id="startForm"><input id="startInput" placeholder="yourcompany.com" aria-label="Your website" autocomplete="url"><button aria-label="Start"><svg><use href="#arrow"/></svg></button></form></div>`);
    $("#startForm").onsubmit = e => {
      e.preventDefault();
      const d = normalizeDomain($("#startInput").value);
      if (d) location.search = "?site=" + encodeURIComponent(d);
      else $("#startInput").focus();
    };
  }

  // ---------- talk-to-us modal ----------
  const modal = $("#talkModal");
  document.querySelectorAll(".js-book").forEach(a => { a.href = CONFIG.bookingUrl; });
  document.addEventListener("click", e => {
    if (e.target.closest(".js-talk")) {
      modal.classList.add("on");
      setTimeout(() => $("#lfName").focus(), 50);
    }
    if (e.target === modal || e.target.closest("[data-close]")) modal.classList.remove("on");
  });
  document.addEventListener("keydown", e => { if (e.key === "Escape") modal.classList.remove("on"); });

  function pilotSummary() {
    const s = seg();
    const lines = [`Company: ${S.company?.name || ""} (${domain})`];
    if (s) lines.push(`Campaign: ${s.name} - ${s.headline}`, `Titles: ${s.titles.join(", ")}`);
    const cos = s && S.companies[s.id];
    if (cos) lines.push(`Target companies: ${cos.map(c => c.domain).join(", ")}`);
    const m = s && S.messages[`${s.id}:${S.personIdx}`];
    if (m) lines.push(`Msg1: ${m.msg1}`);
    return lines.join("\n");
  }

  $("#leadForm").addEventListener("submit", async e => {
    e.preventDefault();
    const f = e.target, btn = $("button[type=submit]", f);
    $("#lfErr").textContent = "";
    btn.disabled = true;
    try {
      await api("/api/lead", {
        name: f.name.value, email: f.email.value, phone: f.phone.value, notes: f.notes.value,
        company_domain: domain || "", company_name: S.company?.name || "", segment: seg()?.name || "",
        stage: `step_${current}`, pilot_summary: pilotSummary(),
      });
      $("#talkForm").hidden = true;
      $("#talkDone").hidden = false;
    } catch (err) {
      $("#lfErr").textContent = err.message;
    } finally {
      btn.disabled = false;
    }
  });

  // ---------- boot ----------
  if (!domain) { showStart(); return; }
  if (!S.company) api("/api/lead", { stage: "url_submitted", company_domain: domain }).catch(() => {});
  run(1);
})();
