// Fig. 1 of the paper, for decision tasks, with the new studies laid over it: every effect size with
// its 95% CI, sorted; the zero line; the two zones with their counts; the pooled estimates at the
// bottom. Colour says which SOURCE a line belongs to.
import { svgIn, widthOf, fmt, esc } from "../lib/metalens-dash.js";
import { describe, SRC_SHORT, legendHtml, scoreColumns } from "./shared.js";
const d3 = window.d3;
const PANELS = [
  { o: "s", title: "Human–AI synergy", sub: "Human–AI system versus max(human, AI)", under: "underperforms the better of the human or AI alone", over: "outperforms the better of the human or AI alone", base: "best of human or AI alone" },
  { o: "h", title: "Human augmentation", sub: "Human–AI system versus human alone", under: "underperforms the human alone", over: "outperforms the human alone", base: "human alone" }];

// two ways to look at the same effect sizes
const MODES = [["effects", "Every effect size with its 95% CI"], ["papers", "One line per paper: range of its findings"]];
export function renderForest(ctx) {
  const mode = document.querySelector("#forest-mode");
  mode.innerHTML = `<span>Show</span><span class="seg" role="group" aria-label="how the effect sizes are drawn">${MODES.map(([v, t]) => `<button type="button" data-m="${v}" aria-pressed="${v === ctx.forestMode}">${t}</button>`).join("")}</span>`;
  mode.onclick = (ev) => { const b = ev.target.closest("[data-m]"); if (!b || b.dataset.m === ctx.forestMode) return; ctx.forestMode = b.dataset.m; document.querySelector("#forest-panel").innerHTML = ""; renderForest(ctx); };
  if (ctx.forestMode === "papers") { renderByPaper(ctx); return; }
  const host = document.querySelector("#forest"); host.innerHTML = "";
  document.querySelector("#forest-legend").innerHTML = legendHtml()
    + `<span class="muted">◆ pooled estimate per source · hover a line, click to pin its evidence</span>`;
  const tips = ctx.tips("#forest-panel");
  for (const P of PANELS) {
    const root = document.createElement("div"); host.appendChild(root);
    const rows = ctx.effects.filter((e) => e[`g_${P.o}`] != null).sort((a, b) => a[`g_${P.o}`] - b[`g_${P.o}`]);
    const W = widthOf(root) - 28, rowH = 2.1, m = { top: 46, right: 12, bottom: 96, left: 12 }, H = m.top + rows.length * rowH + m.bottom;
    const svg = svgIn(root, W, H, P.title);
    const x = d3.scaleLinear().domain([-6, 6]).range([m.left, W - m.right]).clamp(true), y = (i) => m.top + (i + 0.5) * rowH;
    const nNeg = rows.filter((e) => e[`g_${P.o}`] < 0).length, yFlip = m.top + nNeg * rowH, yEnd = m.top + rows.length * rowH;
    svg.append("text").attr("class", "ttl").attr("x", W / 2).attr("y", 16).attr("text-anchor", "middle").text(P.title);
    svg.append("text").attr("class", "sub").attr("x", W / 2).attr("y", 32).attr("text-anchor", "middle").text(P.sub);
    // the two zones, as in the paper: above the flip the combination does worse, below it better
    svg.append("rect").attr("class", "zone").attr("x", m.left).attr("y", m.top).attr("width", x(0) - m.left).attr("height", yFlip - m.top);
    svg.append("rect").attr("class", "zone").attr("x", x(0)).attr("y", yFlip).attr("width", W - m.right - x(0)).attr("height", yEnd - yFlip);
    const lab = (txt, n, xx, yy, anchor) => { const t = svg.append("text").attr("class", "zone-label").attr("x", xx).attr("y", yy).attr("text-anchor", anchor);
      [`The human–AI group`, ...txt.match(/.{1,30}(\s|$)/g).map((s) => s.trim()), `(n = ${n}, ${Math.round(100 * n / rows.length)}%)`].forEach((line, k) => t.append("tspan").attr("x", xx).attr("dy", k ? 14 : 0).text(line)); };
    lab(P.under, nNeg, m.left + 6, m.top + Math.max(16, (yFlip - m.top) / 2 - 24), "start");
    lab(P.over, rows.length - nNeg, W - m.right - 6, yFlip + Math.max(16, (yEnd - yFlip) / 2 - 24), "end");
    // the paper's lines first, the new studies on top and heavier so they can be found
    const order = rows.map((e, i) => ({ e, i })).sort((a, b) => (a.e.source === "new") - (b.e.source === "new"));
    const g = svg.append("g");
    g.selectAll("line").data(order).join("line").attr("class", (r) => `ci src-${r.e.source}`)
      .attr("x1", (r) => x(r.e[`g_${P.o}_lo`])).attr("x2", (r) => x(r.e[`g_${P.o}_hi`])).attr("y1", (r) => y(r.i)).attr("y2", (r) => y(r.i));
    g.selectAll("circle").data(order).join("circle").attr("class", (r) => `pt src-${r.e.source}`).attr("cx", (r) => x(r.e[`g_${P.o}`])).attr("cy", (r) => y(r.i)).attr("r", (r) => (r.e.source === "new" ? 2.6 : 1.3));
    svg.append("line").attr("class", "zero").attr("x1", x(0)).attr("x2", x(0)).attr("y1", m.top).attr("y2", yEnd + 58);
    // pooled estimates
    svg.append("line").attr("x1", m.left).attr("x2", W - m.right).attr("y1", yEnd + 6).attr("y2", yEnd + 6).attr("stroke", "var(--axis)");
    ctx.d.pooled.filter((p) => p.outcome === P.o).forEach((p, k) => {
      const yy = yEnd + 22 + k * 20;
      svg.append("line").attr("class", `pooled src-${p.source}`).attr("x1", x(p.lo)).attr("x2", x(p.hi)).attr("y1", yy).attr("y2", yy);
      svg.append("path").attr("class", `src-${p.source}`).attr("d", d3.symbol(d3.symbolDiamond, 70)()).attr("transform", `translate(${x(p.g)},${yy})`);
      const left = p.g > 0;
      svg.append("text").attr("x", left ? x(Math.min(p.lo, -0.1)) - 8 : x(Math.max(p.hi, 0.1)) + 8).attr("y", yy + 4).attr("text-anchor", left ? "end" : "start")
        .text(`${p.source === "vaccaro" ? "Vaccaro" : "GenAI"}: g = ${p.g.toFixed(2)} (${p.lo.toFixed(2)} to ${p.hi.toFixed(2)}), k = ${p.k}`);
    });
    svg.append("g").attr("class", "ax").attr("transform", `translate(0,${yEnd + 62})`).call(d3.axisBottom(x).tickValues([-6, -3, 0, 3, 6]).tickFormat((v) => String(v).replace("-", "−")));
    svg.append("text").attr("class", "sub").attr("x", W / 2).attr("y", H - 6).attr("text-anchor", "middle").text("Effect sizes (Hedges’ g) with 95% confidence intervals");
    // the rows are 2px high: one hit area finds the nearest row under the pointer
    const hl = svg.append("line").attr("class", "hl").attr("x1", m.left).attr("x2", W - m.right).style("display", "none");
    const at = (ev) => { const [, py] = d3.pointer(ev); return rows[Math.max(0, Math.min(rows.length - 1, Math.floor((py - m.top) / rowH)))]; };
    const say = (e) => describe(e, [{ label: "Hedges’ g", value: e[`g_${P.o}`], text: `${fmt(e[`g_${P.o}`], 2)} (${fmt(e[`g_${P.o}_lo`], 2)} to ${fmt(e[`g_${P.o}_hi`], 2)})` },
      { label: "human + AI", value: e.hai }, { label: "human alone", value: e.human }, { label: "AI alone", value: e.ai }], scoreColumns(e));
    svg.append("rect").attr("class", "hit").attr("x", m.left).attr("y", m.top).attr("width", W - m.left - m.right).attr("height", rows.length * rowH)
      .on("mousemove", (ev) => { const e = at(ev), i = rows.indexOf(e); hl.style("display", null).attr("y1", y(i)).attr("y2", y(i)); tips.show({ ...say(e), formula: e.source === "new" ? `Hedges’ g of human + AI against ${P.o === "s" ? `the better one alone (${e.Baseline === "AI" ? "AI" : "human"})` : "the human alone"}, from the means, SDs and Ns` : undefined }, ev.clientX, ev.clientY); })
      .on("mouseleave", () => { hl.style("display", "none"); tips.hide(); })
      .on("click", (ev) => tips.pin(say(at(ev))));
  }
  const t = ctx.effects.filter((e) => e.g_s != null).sort((a, b) => (b.source === "new") - (a.source === "new") || a.g_s - b.g_s);
  document.querySelector("#forest-table").innerHTML = `<div class="tbl"><table><thead><tr><th>Source</th><th>Study</th><th>Condition</th><th>Metric</th><th>Synergy g</th><th>Augmentation g</th></tr></thead><tbody>`
    + t.map((e) => `<tr><td>${SRC_SHORT[e.source]}</td><td>${esc(e.paper)}</td><td>${esc((e.condition || "").slice(0, 70))}</td><td>${esc((e.metric || "").slice(0, 50))}</td>`
      + `<td class="n">${fmt(e.g_s, 2)} (${fmt(e.g_s_lo, 2)} to ${fmt(e.g_s_hi, 2)})</td><td class="n">${fmt(e.g_h, 2)} (${fmt(e.g_h_lo, 2)} to ${fmt(e.g_h_hi, 2)})</td></tr>`).join("") + `</tbody></table></div>`;
}

// One line per PAPER from its lowest to its highest finding, a small dot for every finding (effect size)
// and a tick at the paper's median. No confidence intervals here: the line is the spread of results
// within a paper, not the uncertainty of one of them.
function renderByPaper(ctx) {
  const host = document.querySelector("#forest"); host.innerHTML = "";
  document.querySelector("#forest-legend").innerHTML = legendHtml() + `<span class="muted">line = lowest to highest finding of a paper · dot = one finding · ❘ = the paper’s median · hover a dot, click to pin its evidence</span>`;
  const tips = ctx.tips("#forest-panel");
  for (const P of PANELS) {
    const root = document.createElement("div"); host.appendChild(root);
    const key = `g_${P.o}`, by = d3.group(ctx.effects.filter((e) => e[key] != null), (e) => `${e.source}|${e.paper}`);
    const papers = [...by.values()].map((rows) => ({ rows, source: rows[0].source, paper: rows[0].paper, lo: d3.min(rows, (e) => e[key]), hi: d3.max(rows, (e) => e[key]), med: d3.median(rows, (e) => e[key]) }))
      .sort((a, b) => a.med - b.med);
    const W = widthOf(root) - 28, rowH = 13, m = { top: 46, right: 14, bottom: 44, left: Math.min(170, W * 0.3) }, H = m.top + papers.length * rowH + m.bottom;
    const svg = svgIn(root, W, H, `${P.title}, one line per paper`);
    const ext = d3.extent(papers.flatMap((p) => [p.lo, p.hi])), x = d3.scaleLinear().domain([Math.max(-6, Math.floor(ext[0])), Math.min(6, Math.ceil(ext[1]))]).range([m.left, W - m.right]).clamp(true);
    const y = (i) => m.top + (i + 0.5) * rowH, yEnd = m.top + papers.length * rowH;
    svg.append("text").attr("class", "ttl").attr("x", (m.left + W - m.right) / 2).attr("y", 16).attr("text-anchor", "middle").text(P.title);
    svg.append("text").attr("class", "sub").attr("x", (m.left + W - m.right) / 2).attr("y", 32).attr("text-anchor", "middle").text(P.sub);
    svg.append("g").attr("class", "grid").attr("transform", `translate(0,${yEnd})`).call(d3.axisBottom(x).ticks(6).tickSize(-(yEnd - m.top)).tickFormat(""));
    svg.append("line").attr("class", "zero").attr("x1", x(0)).attr("x2", x(0)).attr("y1", m.top - 4).attr("y2", yEnd);
    svg.append("g").attr("class", "ax").attr("transform", `translate(0,${yEnd})`).call(d3.axisBottom(x).ticks(6).tickFormat((v) => String(v).replace("-", "−")));
    svg.append("text").attr("class", "sub").attr("x", (m.left + W - m.right) / 2).attr("y", H - 6).attr("text-anchor", "middle").text("Hedges’ g of each finding (no confidence intervals in this view)");
    const g = svg.append("g").selectAll("g").data(papers).join("g").attr("transform", (p, i) => `translate(0,${y(i)})`);
    g.append("text").attr("x", m.left - 8).attr("y", 4).attr("text-anchor", "end").attr("font-size", 11).attr("fill", (p) => (p.source === "new" ? "var(--new)" : "var(--ink-2)"))
      .attr("font-weight", (p) => (p.source === "new" ? 600 : 400)).text((p) => (p.paper.length > 24 ? `${p.paper.slice(0, 23)}…` : p.paper));
    g.append("line").attr("class", (p) => `src-${p.source}`).attr("stroke-width", (p) => (p.source === "new" ? 2.4 : 1.6)).attr("opacity", 0.75).attr("x1", (p) => x(p.lo)).attr("x2", (p) => x(p.hi));
    g.append("line").attr("class", (p) => `src-${p.source}`).attr("stroke-width", 2).attr("x1", (p) => x(p.med)).attr("x2", (p) => x(p.med)).attr("y1", -5).attr("y2", 5);
    const dots = g.selectAll("circle").data((p) => p.rows).join("circle").attr("class", (e) => `src-${e.source}`).attr("stroke", "var(--surface)").attr("stroke-width", 0.8)
      .attr("cx", (e) => x(e[key])).attr("r", (e) => (e.source === "new" ? 3.4 : 2.6));
    tips.mark(dots, (e) => describe(e, [{ label: "Hedges’ g", value: e[key], text: `${fmt(e[key], 2)} (${fmt(e[`${key}_lo`], 2)} to ${fmt(e[`${key}_hi`], 2)})` },
      { label: "human + AI", value: e.hai }, { label: "human alone", value: e.human }, { label: "AI alone", value: e.ai }], scoreColumns(e)));
  }
}
