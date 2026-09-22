// The page: reads data/derived.json (built by analysis/build.R) and the Metalens release it was
// built from, then draws the sections. Nothing is computed here that is a statistical estimate.
import { loadRelease, createTips, esc, day } from "../lib/metalens-dash.js";
import { renderSummary, renderMethods, renderText } from "./summary.js";
import { loadText } from "./text.js";
import { renderForest } from "./forest.js";
import { renderSubgroups } from "./subgroups.js";
import { renderScatter, renderMargin, renderThreshold, renderWorst, renderBins, descTable } from "./descriptive.js";
import { VAC } from "./shared.js";

const $ = (s) => document.querySelector(s);

async function init() {
  const d = await (await fetch("data/derived.json", { cache: "no-cache" })).json();   // revalidate: the numbers move with each release
  const release = await loadRelease(`data/${d.meta.release_dir}`);
  await release.table();
  const ctx = { d, release, effects: d.effects, source: "both", forestMode: "effects",
    tips: (panel) => createTips({ release, panel }) };
  const m = d.meta, rel = m.release;
  document.querySelectorAll("[data-vac]").forEach((el) => { el.innerHTML = VAC; });          // every mention of the paper links to it
  $("#dataline").innerHTML = `<span class="src"><span class="dot" style="background:var(--vaccaro)"></span><span><b>${VAC}</b> · ${m.sources.vaccaro.k} decision-task effect sizes from ${m.sources.vaccaro.n_exp} experiments, ${m.sources.vaccaro.years.join("–")}</span></span>`
    + `<span class="src"><span class="dot" style="background:var(--new)"></span><span><b>Metalens dataset</b> · “${esc(m.dataset_label)}”, release v${rel.number}, ${esc(day(rel.created_at))} · ${m.sources.new.n_papers} papers, ${m.sources.new.years.join("–")} · `
    + `<span class="badge" title="how much of the dataset a person has checked against the papers">${esc((rel.credibility || {}).label || "")}</span>`
    + (rel.doi ? ` · <a href="https://doi.org/${encodeURIComponent(rel.doi)}" target="_blank" rel="noopener" title="the DOI of this release">doi:${esc(rel.doi)}</a>` : "") + `</span></span>`;
  $("#byline").innerHTML = `${esc(m.authors || "")}${m.authors ? " · " : ""}Built with <a href="${esc(m.metalens_url || "https://beta.metalens.tech")}" target="_blank" rel="noopener">Metalens</a>`;
  $("#forest-intro").innerHTML = `Each comparison sets the human–AI combination against a <b>baseline</b> and expresses the difference as a standardised mean difference (Hedges’ <i>g</i>; above zero = the combination did better). Two baselines are used, as in Fig. 1 of ${VAC}. <b>Left, synergy:</b> the baseline is whichever did better alone in that experiment, the human or the AI. <b>Right, augmentation:</b> the baseline is the human alone. Decision tasks only, with the GenAI studies laid over the earlier ones.`;
  ctx.text = await loadText(d);
  renderSummary(ctx); renderText(ctx); renderMethods(ctx);
  const draw = () => { renderForest(ctx); renderSubgroups(ctx); drawDesc(); };
  const drawDesc = () => { renderScatter(ctx); renderWorst(ctx); renderMargin(ctx); renderThreshold(ctx); renderBins(ctx); descTable(ctx); syncControls(); };
  // the same switch above each of these figures; all of them follow it
  const opts = [["both", "Both"], ["vaccaro", "Vaccaro et al."], ["new", "GenAI studies"]];
  const syncControls = () => document.querySelectorAll("[data-source-control]").forEach((host) => {
    const n = ctx.effects.filter((e) => ctx.source === "both" || e.source === ctx.source).length;
    host.innerHTML = `<span>Show</span><span class="seg" role="group" aria-label="which studies">${opts.map(([v, t]) => `<button type="button" data-v="${v}" aria-pressed="${v === ctx.source}">${t}</button>`).join("")}</span>`
      + `<span class="muted">${n} comparisons</span>`;
  });
  document.querySelector("#sec-desc").addEventListener("click", (ev) => {
    const b = ev.target.closest("[data-source-control] [data-v]"); if (!b) return;
    const keep = b.closest("[data-source-control]"), top = keep.getBoundingClientRect().top;
    ctx.source = b.dataset.v; drawDesc();
    scrollBy(0, keep.getBoundingClientRect().top - top);                                       // the clicked switch stays where it was
  });
  draw();
  let w = innerWidth, t = null;
  addEventListener("resize", () => { if (Math.abs(innerWidth - w) < 24) return; w = innerWidth; clearTimeout(t); t = setTimeout(draw, 150); });
}
init().catch((e) => { document.querySelector("main").insertAdjacentHTML("afterbegin", `<p style="padding:24px;color:#a00">Could not load the data: ${esc(e.message)}. Serve this folder over http (e.g. <code>python3 -m http.server</code>) and run <code>Rscript analysis/build.R</code> first.</p>`); });
