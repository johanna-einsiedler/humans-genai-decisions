// The written summary and the methods text. The prose is fixed; every number in it is read from
// data/derived.json, so it stays true when a new release is dropped in.
import { esc, fmt, day } from "../lib/metalens-dash.js";
import { VAC } from "./shared.js";
const $ = (s) => document.querySelector(s);
const g = (p) => `<i>g</i> = ${p.g.toFixed(2)} (95% CI ${p.lo.toFixed(2)} to ${p.hi.toFixed(2)})`;
const verdict = (p) => (p.lo > 0 ? "a gain" : p.hi < 0 ? "a loss" : "no clear difference");
const share = (rows, f) => (rows.length ? Math.round(100 * rows.filter(f).length / rows.length) : 0);

export function renderSummary({ d }) {
  const P = (o, s) => d.pooled.find((p) => p.outcome === o && p.source === s);
  const sv = P("s", "vaccaro"), sn = P("s", "new"), hv = P("h", "vaccaro"), hn = P("h", "new"), av = P("a", "vaccaro"), an = P("a", "new"), S = d.meta.sources;
  const ev = d.effects.filter((e) => e.source === "vaccaro"), en = d.effects.filter((e) => e.source === "new");
  // every tile is ONE statistic, shown for both groups side by side
  const side = (c, who, v, u) => `<div><div class="who"><span class="dot" style="background:var(--${c})"></span>${who}</div><div class="v">${v}</div><div class="u">${u}</div></div>`;
  const tile = (label, a, b) => `<div class="tile"><div class="l">${label}</div><div class="pair">${side("vaccaro", "Vaccaro et al.", ...a)}${side("new", "GenAI studies", ...b)}</div></div>`;
  const G = (p) => [p.g.toFixed(2).replace("-", "−"), `95% CI ${p.lo.toFixed(2).replace("-", "−")} to ${p.hi.toFixed(2).replace("-", "−")}<br/>k = ${p.k} effect sizes`];
  const Sh = (rows, f) => [`${share(rows, f)}%`, `${rows.filter(f).length} of ${rows.length} comparisons`];
  $("#tiles").innerHTML = tile("Team vs the better of human or AI alone (Hedges’ g)", G(sv), G(sn))
    + tile("Team vs the human alone (Hedges’ g)", G(hv), G(hn))
    + tile("Team vs the AI alone (Hedges’ g)", G(av), G(an))
    + tile("Comparisons where the team beat its stronger member", Sh(ev, (e) => e.helps), Sh(en, (e) => e.helps))
    + tile("Comparisons where the AI alone was stronger than the human alone", Sh(ev, (e) => e.Baseline === "AI"), Sh(en, (e) => e.Baseline === "AI"))
    + tile("Comparisons, experiments, papers", [S.vaccaro.k, `${S.vaccaro.n_exp} experiments · ${S.vaccaro.n_papers} papers<br/>${S.vaccaro.years.join("–")}`], [S.new.k, `${S.new.n_exp} experiments · ${S.new.n_papers} papers<br/>${S.new.years.join("–")}`]);
}

// the text of text.md, numbers filled in; a notice when its conclusions no longer match the data
export function renderText({ text }) {
  $("#summary-text").innerHTML = (text.stale.length ? `<p class="stale"><b>This text needs a review.</b> It was written for conclusions the data no longer supports: ${text.stale.map(esc).join("; ")}. The numbers below are current; the sentences may not be.</p>` : "") + text.html.summary;
  if (text.html.lede) document.querySelector(".lede").innerHTML = text.html.lede.replace(/^<p>|<\/p>$/g, "");
}

export function renderMethods({ d }) {
  const m = d.meta, rel = m.release, lo = rel.left_out;
  $("#methods-text").innerHTML = `
    <p><b>Effect sizes and models</b> follow ${VAC}. For every comparison, Hedges’ <i>g</i> is the standardised difference between the human–AI score and a baseline: the better of human alone and AI alone (synergy), or the human alone (augmentation); outcomes where lower is better are sign-flipped. Averages come from a three-level random-effects model (effect sizes nested in experiments, REML) with cluster-robust confidence intervals, fitted with <code>metafor</code> ${esc(m.metafor)} in R. Run on all 370 of their effect sizes, the script reproduces the published estimates (<code>analysis/validate.R</code>). Subgroup averages are the levels of a meta-regression fitted per source; where that is not estimable, the level is fitted on its own.</p>
    <p><b>What is included.</b> Decision tasks only. From ${VAC}: ${m.sources.vaccaro.k} effect sizes. From the Metalens dataset: comparisons with all three scores (${m.sources.new.k}${lo && lo.rows ? `; ${lo.rows} of ${lo.of} extracted rows lack one and are left out` : ""}). An effect size needs the standard deviations and sample sizes as well, which ${m.sources.new.k_with_g} of them report; AI alone has no spread over people and enters with a standard deviation of zero, as per the codebook of ${VAC}.</p>
    <p><b>Proportion scale.</b> The figures in original units use comparisons whose scores lie between 0 and 1 (${m.sources.vaccaro.k_prop} from Vaccaro et al., ${m.sources.new.k_prop} from the GenAI studies); only “who is the worst of the three” uses all comparisons. In the lead-by-bin figure, bins are right-closed (0–5 means above 0 up to 5) and a tie between team and AI does not count as the team beating the AI. GenAI studies that report an accuracy or percent score on 0–100 are divided by 100.</p>
    <p><b>Subgroups.</b> A subgroup row is drawn only when the GenAI studies have at least ${m.rule.min_k} effect sizes from at least ${m.rule.min_exp} experiments in it and Vaccaro et al. have that level too.</p>
    <p><b>The GenAI data</b> (“${esc(m.dataset_label)}”) were extracted from the papers with <a href="${esc(m.metalens_url || "https://beta.metalens.tech")}" target="_blank" rel="noopener">Metalens</a>, checked against the source by ${esc(m.verified_by || "a person")}, and frozen as release v${rel.number} (${esc(day(rel.created_at))}, ${esc((rel.credibility || {}).label || "")}).</p>`;
  renderCite({ d });
  document.querySelector("#foot").innerHTML = `<p class="muted">Built ${esc(day(m.built_at))} · ${esc(m.r)} · made with Metalens release files and D3.</p>`;
}

// ── Cite this work: this page, then the data it rests on ─────────────────────────────────────
const VACCARO_TXT = "Vaccaro, M., Almaatouq, A. & Malone, T. (2024). When combinations of humans and AI are useful: A systematic review and meta-analysis. Nature Human Behaviour, 8, 2293–2303. https://doi.org/10.1038/s41562-024-02024-1";
const VACCARO_BIB = `@article{vaccaro2024combinations,
    author = {Vaccaro, Michelle and Almaatouq, Abdullah and Malone, Thomas},
    title = {When combinations of humans and {AI} are useful: A systematic review and meta-analysis},
    journal = {Nature Human Behaviour},
    year = {2024},
    volume = {8},
    pages = {2293--2303},
    doi = {10.1038/s41562-024-02024-1}
}`;
export function renderCite({ d }) {
  const m = d.meta, rel = m.release;
  const url = location.origin + location.pathname.replace(/index\.html$/, "");
  const title = document.querySelector("h1").textContent.trim();
  const year = String(m.built_at || rel.created_at || "").slice(0, 4);
  const authors = (m.authors || "").split(",").map((a) => a.trim()).filter(Boolean);
  const first = (authors[0] || "").split(" ").slice(-1)[0].toLowerCase().replace(/[^a-z]/g, "") || "dashboard";
  const state = `release v${rel.number} of the Metalens dataset “${m.dataset_label}” (${day(rel.created_at)}${rel.doi ? `, doi:${rel.doi}` : ""})`;
  const page = `${authors.join(", ") || "Anonymous"} (${year}) – “${title}”. A living meta-analysis, published online at ${url}. Retrieved from: '${url}' [Online Resource], showing ${state}.`;
  const bib = `@misc{${first}${year}humansgenai,
    author = {${authors.join(" and ")}},
    title = {${title}: a living meta-analysis},
    year = {${year}},
    howpublished = {\\url{${url}}},
    note = {Showing ${state}}
}`;
  const data = rel.citation ? `${rel.citation}${rel.doi && !rel.citation.includes(rel.doi) ? ` https://doi.org/${rel.doi}` : ""}` : "";
  const box = (text) => `<div class="citebox"><button type="button" class="copy" title="copy to clipboard">copy</button>${esc(text)}</div>`;
  document.querySelector("#cite-text").innerHTML = `
    <p>This page rests on two sources of data: ${VAC} and a Metalens dataset. When citing it, please also cite them. The page can be cited as:</p>
    ${box(page)}
    <h3>BibTeX</h3>${box(bib)}
    ${data ? `<h3>The GenAI data (release v${rel.number})</h3>${box(data)}` : ""}
    <h3>The original meta-analysis</h3>${box(VACCARO_TXT)}${box(VACCARO_BIB)}`;
  document.querySelectorAll("#cite-text .copy").forEach((b) => (b.onclick = async () => {
    try { await navigator.clipboard.writeText(b.parentElement.textContent.replace(/^copy/, "").trim()); b.textContent = "copied"; setTimeout(() => (b.textContent = "copy"), 1500); }
    catch { b.textContent = "select & copy"; }
  }));
}
