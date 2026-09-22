// The written parts of the page live in text.md (edited by a person). This fills the {placeholders}
// with the current numbers and checks whether the conclusions the text was written for still hold.
import { esc } from "../lib/metalens-dash.js";
import { VAC } from "./shared.js";

const neg = (x) => x.toFixed(2).replace("-", "−");
const gTxt = (p) => `<i>g</i> = ${neg(p.g)} (95% CI ${neg(p.lo)} to ${neg(p.hi)})`;
const ciTxt = (p) => `${neg(p.g)} (95% CI ${neg(p.lo)} to ${neg(p.hi)})`;
export const conclusion = (p) => (p.lo > 0 ? "a gain" : p.hi < 0 ? "a loss" : "no clear difference");

export function placeholders(d) {
  const P = (o, s) => d.pooled.find((p) => p.outcome === o && p.source === s), S = d.meta.sources;
  const out = { vac_link: VAC, dataset: esc(d.meta.dataset_label || ""),
    vac_k: S.vaccaro.k, vac_exp: S.vaccaro.n_exp, vac_papers: S.vaccaro.n_papers, vac_years: S.vaccaro.years.join("–"),
    new_k: S.new.k, new_exp: P("s", "new").n_exp, new_papers: S.new.n_papers, new_years: S.new.years.join("–"), new_k_g: S.new.k_with_g };
  for (const o of ["s", "h", "a"]) for (const s of ["vaccaro", "new"]) {
    const p = P(o, s), k = `${o}_${s === "vaccaro" ? "vac" : "new"}`;
    if (p && p.g != null) { out[`g_${k}`] = gTxt(p); out[`ci_${k}`] = ciTxt(p); out[`concl_${k}`] = conclusion(p); }
  }
  // the trend words: fixed wording, chosen from the intervals (no generated text anywhere on this page)
  const hn = P("h", "new"), hv = P("h", "vaccaro");
  out.trend_h_new = hn.lo > 0 && hv.lo > 0 ? "thus confirming the trend" : hn.hi < 0 ? "reversing the earlier trend" : "leaving the earlier trend unconfirmed";
  return out;
}

// a very small Markdown: paragraphs, *em*, **strong**; everything else is text
const md = (s) => s.trim().split(/\n\s*\n/).map((p) => `<p>${p.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/\*(.+?)\*/g, "<em>$1</em>")}</p>`).join("");

export async function loadText(d) {
  const raw = await (await fetch("text.md", { cache: "no-cache" })).text();
  const body = raw.replace(/<!--[\s\S]*?-->/, "");
  const wf = {}; const wfBlock = /written_for:\n((?:[ \t]+.*\n?)+)/.exec(body);
  if (wfBlock) for (const line of wfBlock[1].split("\n")) { const m = /^\s+(\w+):\s*([^#]+)/.exec(line); if (m) wf[m[1]] = m[2].trim(); }
  const sections = {}; const parts = body.split(/^## /m).slice(1);
  for (const part of parts) { const nl = part.indexOf("\n"); sections[part.slice(0, nl).trim()] = part.slice(nl + 1); }
  const ph = placeholders(d);
  const fill = (t) => md(t).replace(/\{(\w+)\}/g, (_, k) => (k in ph ? String(ph[k]) : `<mark>{${k}}</mark>`));
  // do the conclusions the text was written for still hold?
  const P = (o) => d.pooled.find((p) => p.outcome === o && p.source === "new");
  const now = { synergy_new: conclusion(P("s")), augmentation_new: conclusion(P("h")), vs_ai_new: conclusion(P("a")) };
  const stale = Object.keys(wf).filter((k) => k in now && wf[k] !== now[k]).map((k) => `${k.replace("_new", "")}: written for “${wf[k]}”, the data now says “${now[k]}”`);
  return { html: Object.fromEntries(Object.entries(sections).map(([k, v]) => [k, fill(v)])), stale };
}
