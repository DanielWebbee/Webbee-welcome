// Demo fixtures used when MOCK=1, so the UI can be developed and shown without API calls.
// All companies and people here are fictional.
const company = (domain) => ({
  domain, name: "Northwind Analytics", one_liner: "Revenue analytics platform for mid-market SaaS finance teams",
  description: "Northwind connects billing, CRM and accounting data to give CFOs a live view of ARR, churn and cash runway, replacing spreadsheet reporting.",
  category: "B2B SaaS - finance analytics",
  offer: ["Live ARR and churn dashboards", "Board-ready reporting", "Forecasting and runway planning"],
  value_props: ["Close the month 4 days faster", "One source of truth for revenue metrics", "Set up in under two weeks"],
  proof_points: ["Used by 120+ SaaS finance teams", "SOC 2 Type II certified"],
  customers_mentioned: ["Brightline", "Kestrel HR", "Orbitly"],
  hq: "Tel Aviv, Israel", founded: "2019", employees_estimate: "51-200",
  target_market: "SaaS companies with $5M-$100M ARR",
  keywords: ["revenue analytics", "SaaS metrics", "ARR reporting", "FP&A", "CFO tools", "churn analysis", "board reporting"],
});

export const MOCK = {
  company: ({ domain }) => company(domain),
  competitors: () => ({
    product_summary: ["Revenue analytics for SaaS finance teams", "Connects billing, CRM and accounting", "Replaces spreadsheet-based board reporting"],
    search_queries: ["SaaS revenue analytics platform", "ARR reporting tool for CFOs", "SaaS metrics dashboard"],
    competitors: [
      { name: "ChartMogul", domain: "chartmogul.com", note: "Subscription analytics and revenue reporting" },
      { name: "Baremetrics", domain: "baremetrics.com", note: "Stripe-first SaaS metrics dashboards" },
      { name: "Mosaic", domain: "mosaic.tech", note: "Strategic finance and FP&A platform" },
      { name: "Causal", domain: "causal.app", note: "Financial modelling and planning" },
      { name: "ProfitWell", domain: "profitwell.com", note: "Subscription metrics and retention" },
      { name: "Maxio", domain: "maxio.com", note: "Billing plus SaaS revenue reporting" },
      { name: "Runway", domain: "runway.com", note: "Modern FP&A and forecasting" },
      { name: "Planful", domain: "planful.com", note: "Enterprise financial planning suite" },
    ],
  }),
  segments: () => ({
    segments: [
      { id: "scaleup-cfos", name: "Scale-up CFOs", headline: "Give post-Series B CFOs a live revenue view before the next board meeting", pain: "Board decks still take a week of spreadsheet work every month", criteria: ["Series B-C SaaS", "50-300 employees", "Finance team of 2-8"], titles: ["CFO", "VP Finance"], example_companies: ["Brightline", "Kestrel HR", "Orbitly"], fit_score: 94, est_accounts: "1.4K" },
      { id: "revops-leaders", name: "RevOps Leaders", headline: "Unify billing and CRM data for revenue operations teams", pain: "Sales and finance report different ARR numbers", criteria: ["B2B SaaS", "Salesforce or HubSpot CRM", "Usage or hybrid pricing"], titles: ["Head of RevOps", "VP Revenue Operations"], example_companies: ["Lumen Desk", "Tallyfy", "Gridline"], fit_score: 88, est_accounts: "2.1K" },
      { id: "pe-portfolio", name: "PE Portfolio Finance", headline: "Standardise SaaS metrics across a private equity portfolio", pain: "Every portfolio company reports metrics differently", criteria: ["PE-backed SaaS", "$10M+ ARR", "Recent acquisition"], titles: ["Portfolio CFO", "Operating Partner"], example_companies: ["Vantage Group", "Harbor Software", "Clearpath"], fit_score: 81, est_accounts: "600" },
      { id: "fpa-teams", name: "FP&A Teams", headline: "Replace manual forecasting with live revenue models", pain: "Forecasts are outdated the day they ship", criteria: ["200-1000 employees", "Dedicated FP&A", "Multi-currency"], titles: ["Head of FP&A", "Finance Director"], example_companies: ["Polaris Cloud", "Fintra", "Signalwise"], fit_score: 76, est_accounts: "1.8K" },
      { id: "founder-led", name: "Founder-led SaaS", headline: "Investor-ready metrics for founders without a CFO", pain: "Founders spend nights building investor updates", criteria: ["Seed-Series A", "No full-time CFO", "$1M-$5M ARR"], titles: ["CEO", "Co-founder"], example_companies: ["Paperkite", "Loomly", "Stackwise"], fit_score: 68, est_accounts: "3.5K" },
    ],
  }),
  companies: () => ({
    companies: [
      { name: "Brightline", domain: "brightline.example", description: "Workforce scheduling SaaS for hospitals", location: "Tel Aviv, Israel", size: "120", signal: "Raised Series B" },
      { name: "Kestrel HR", domain: "kestrelhr.example", description: "HR platform for distributed teams", location: "London, UK", size: "210", signal: "Hiring a Head of FP&A" },
      { name: "Orbitly", domain: "orbitly.example", description: "Product analytics for mobile apps", location: "Berlin, Germany", size: "85", signal: "Expanding to the US" },
      { name: "Lumen Desk", domain: "lumendesk.example", description: "AI help desk for e-commerce", location: "Austin, US", size: "140", signal: "" },
      { name: "Gridline", domain: "gridline.example", description: "Energy data platform for utilities", location: "Amsterdam, NL", size: "95", signal: "New CFO in role" },
      { name: "Fintra", domain: "fintra.example", description: "Treasury automation for SMBs", location: "Herzliya, Israel", size: "60", signal: "Launched usage-based pricing" },
      { name: "Signalwise", domain: "signalwise.example", description: "Sales intelligence for B2B teams", location: "New York, US", size: "175", signal: "" },
      { name: "Polaris Cloud", domain: "polariscloud.example", description: "Cloud cost management", location: "Toronto, Canada", size: "230", signal: "Raised Series C" },
    ],
  }),
  people: () => ({
    people: [
      { first_name: "Dana", last_initial: "L", title: "CFO", company_name: "Brightline", company_domain: "brightline.example", location: "Tel Aviv", why: "Owns board reporting after the Series B", verified: true },
      { first_name: "Mark", last_initial: "R", title: "VP Finance", company_name: "Kestrel HR", company_domain: "kestrelhr.example", location: "London", why: "Building out FP&A from scratch", verified: true },
      { first_name: "Lena", last_initial: "W", title: "CFO", company_name: "Orbitly", company_domain: "orbitly.example", location: "Berlin", why: "US expansion means multi-entity reporting", verified: true },
      { first_name: "Omer", last_initial: "S", title: "VP Finance", company_name: "Fintra", company_domain: "fintra.example", location: "Herzliya", why: "New pricing model complicates ARR", verified: true },
      { first_name: "", last_initial: "", title: "CFO", company_name: "Gridline", company_domain: "gridline.example", location: "", why: "", verified: false },
      { first_name: "", last_initial: "", title: "VP Finance", company_name: "Polaris Cloud", company_domain: "polariscloud.example", location: "", why: "", verified: false },
    ],
  }),
  message: ({ person }) => ({
    language: "English",
    connection_note: "",
    msg1: `thanks for connecting ${person?.first_name || "{first_name}"}. how long does the monthly board pack take your team right now?`,
    msg2: "most finance teams we talk to lose close to a week a month stitching billing and CRM exports together. one SaaS CFO we work with cut that to a day once ARR and churn were live. is that kind of reporting lag on your radar this quarter?",
    msg3: "worth a 15 minute look at how that would work with your stack? if someone else owns reporting, happy to be pointed their way.",
    signals_used: ["Recently raised Series B", "CFO role owns board reporting"],
    proof_used: "Used by 120+ SaaS finance teams",
  }),
};
