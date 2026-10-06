// Runs one research step: Claude works (optionally with web search) and returns its
// result by calling a strict `submit` tool, so every step yields schema-valid JSON.
import Anthropic from "@anthropic-ai/sdk";

const MODEL = process.env.CLAUDE_MODEL || "claude-opus-5-5";
let client;
const getClient = () => (client ??= new Anthropic());

export class StepError extends Error {}

export async function runStep({ system, prompt, schema, search = 0, fetchPages = 0, effort = "medium" }) {
  const tools = [{
    name: "submit",
    description: "Submit the final result for this step. Call exactly once, when the work is done.",
    strict: true,
    input_schema: schema,
  }];
  if (search) tools.unshift({ type: "web_search_20260209", name: "web_search", max_uses: search });
  if (fetchPages) tools.unshift({ type: "web_fetch_20260209", name: "web_fetch", max_uses: fetchPages });

  const messages = [{ role: "user", content: prompt }];
  const seenUrls = new Set();
  let nudges = 0;

  for (let turn = 0; turn < 8; turn++) {
    const response = await getClient().beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort },
      system,
      tools,
      tool_choice: { type: "auto" },
      messages,
    });

    if (response.stop_reason === "refusal") throw new StepError("The research agent declined this request.");

    for (const block of response.content) {
      if (block.type === "web_search_tool_result" && Array.isArray(block.content)) {
        for (const r of block.content) if (r.url) seenUrls.add(normalizeUrl(r.url));
      }
      if (block.type === "web_fetch_tool_result" && block.content?.url) seenUrls.add(normalizeUrl(block.content.url));
    }

    const submit = response.content.find(b => b.type === "tool_use" && b.name === "submit");
    if (submit) {
      if (!submit.input || typeof submit.input !== "object") throw new StepError("Malformed result.");
      return { result: submit.input, seenUrls };
    }

    messages.push({ role: "assistant", content: response.content });
    if (response.stop_reason === "pause_turn") continue;
    if (response.stop_reason === "max_tokens" || nudges >= 2) break;
    nudges++;
    messages.push({ role: "user", content: "Call the submit tool now with your result." });
  }
  throw new StepError("The research agent did not finish this step.");
}

export function normalizeUrl(u) {
  try {
    const x = new URL(u);
    return (x.hostname.replace(/^(www|[a-z]{2})\./, "") + x.pathname).replace(/\/+$/, "").toLowerCase();
  } catch {
    return String(u).toLowerCase();
  }
}
