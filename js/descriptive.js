// The three figures in the papers' own units (proportion-scale outcomes): who is stronger alone,
// the team's margin over its stronger member, and the AI lead at which the AI alone wins. One source
// control (ctx.source: both | vaccaro | new) filters all three.
import { svgIn, widthOf, fmt, esc, hash01 } from "../lib/metalens-dash.js";
import { describe, scoreColumns, SRC_SHORT, SRC, legendHtml } from "./shared.js";
const d3 = window.d3;
const P = (v) => `${Math.round(100 * v)}%`;
const inSource = (ctx) => (e) => ctx.source === "both" || e.source === ctx.source;
const rowsOf = (ctx) => ctx.effects.filter((e) => e.prop).filter(inSource(ctx));
const sources = (ctx) => (ctx.source === "both" ? ["vaccaro", "new"] : [ctx.source]);
const say = (e) => describe(e, [{ label: "human", value: e.human, text: P(e.human_p) }, { label: "AI", value: e.ai, text: P(e.ai_p) }, { label: "human + AI", value: e.hai, text: P(e.hai_p) },
  { label: "vs best alone", value: e.margin_pp, text: `${e.margin_pp > 0 ? "+" : "−"}${Math.abs(e.margin_pp).toFixed(1)} pp` }], scoreColumns(e));
const shape = (e) => d3.symbol(e.source === "new" ? d3.symbolDiamond : d3.symbolCircle, e.source === "new" ? 70 : 40)();

export function renderScatter(ctx) {
  const root = document.querySelector("#scatter"); root.innerHTML = "";
  const rows = rowsOf(ctx), tips = ctx.tips("#scatter-panel");
  document.querySelector("#scatter-legend").innerHTML = `<span><span class="sw" style="background:var(--helps)"></span>H+AI beats best solo</span><span><span class="sw" style="background:var(--loses)"></span>Best solo still wins</span>`
    + `<span class="muted">● Vaccaro et al. · ◆ GenAI studies · hollow = not yet verified</span>`;
  const W = Math.min(720, widthOf(root) - 28), H = W, m = { top: 14, right: 18, bottom: 46, left: 56 };
  const svg = svgIn(root, W, H, "Human alone against AI alone");
  const x = d3.scaleLinear().domain([0, 1]).range([m.left, W - m.right]), y = d3.scaleLinear().domain([0, 1]).range([H - m.bottom, m.top]);
  svg.append("g").attr("class", "grid").attr("transform", `translate(0,${H - m.bottom})`).call(d3.axisBottom(x).ticks(4).tickSize(-(H - m.top - m.bottom)).tickFormat(""));
  svg.append("g").attr("class", "grid").attr("transform", `translate(${m.left},0)`).call(d3.axisLeft(y).ticks(4).tickSize(-(W - m.left - m.right)).tickFormat(""));
  svg.append("g").attr("class", "ax").attr("transform", `translate(0,${H - m.bottom})`).call(d3.axisBottom(x).ticks(4).tickFormat(d3.format(".0%")));
  svg.append("g").attr("class", "ax").attr("transform", `translate(${m.left},0)`).call(d3.axisLeft(y).ticks(4).tickFormat(d3.format(".0%")));
  svg.append("line").attr("class", "ref").attr("x1", x(0)).attr("y1", y(0)).attr("x2", x(1)).attr("y2", y(1));
  const lab = (t, dx, dy) => svg.append("text").attr("class", "sub").attr("text-anchor", "middle").attr("transform", `translate(${x(0.8) + dx},${y(0.8) + dy}) rotate(-45)`).text(t);
  lab("AI stronger …", -16, -16); lab("… Human stronger", 16, 16);
  svg.append("text").attr("class", "ttl").attr("x", (m.left + W - m.right) / 2).attr("y", H - 8).attr("text-anchor", "middle").text("Human alone score");
  svg.append("text").attr("class", "ttl").attr("transform", "rotate(-90)").attr("x", -(m.top + H - m.bottom) / 2).attr("y", 14).attr("text-anchor", "middle").text("AI alone score");
  const order = [...rows].sort((a, b) => (a.source === "new") - (b.source === "new"));
  const pts = svg.append("g").selectAll("path").data(order).join("path").attr("d", shape)
    .attr("class", (e) => `pt2 ${e.helps ? "out-helps" : "out-loses"}${e.source === "new" && e.status !== "verified" ? " unverified" : ""}`)
    .attr("transform", (e) => `translate(${x(Math.max(0, Math.min(1, e.human_p)))},${y(Math.max(0, Math.min(1, e.ai_p)))})`);
  tips.mark(pts, say);
}

export function renderMargin(ctx) {
  const root = document.querySelector("#margin"); root.innerHTML = "";
  document.querySelector("#margin-legend").innerHTML = `<span class="muted">● Vaccaro et al. · ◆ GenAI studies · hollow = not yet verified · box = quartiles and median</span>`;
  const rows = rowsOf(ctx).filter((e) => e.margin_pp != null), tips = ctx.tips("#margin-panel");
  const groups = [{ key: "Human", label: "Human outperforms AI alone" }, { key: "AI", label: "AI outperforms human alone" }];
  const W = widthOf(root) - 28, H = 440, m = { top: 16, right: 18, bottom: 58, left: 64 };
  const svg = svgIn(root, W, H, "Team score minus best solo score");
  const every = ctx.effects.filter((e) => e.prop && e.margin_pp != null);          // the scale does not move with the filter
  const lo = Math.min(-20, Math.floor(d3.min(every, (e) => e.margin_pp) / 10) * 10), hi = Math.max(20, Math.ceil(d3.max(every, (e) => e.margin_pp) / 10) * 10);
  const y = d3.scaleLinear().domain([lo, hi]).range([H - m.bottom, m.top]), x = d3.scaleBand().domain(groups.map((g) => g.key)).range([m.left, W - m.right]).padding(0.28);
  svg.append("g").attr("class", "grid").attr("transform", `translate(${m.left},0)`).call(d3.axisLeft(y).ticks(8).tickSize(-(W - m.left - m.right)).tickFormat(""));
  svg.append("g").attr("class", "ax").attr("transform", `translate(${m.left},0)`).call(d3.axisLeft(y).ticks(8).tickFormat((v) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v)} pp`));
  svg.append("line").attr("class", "zero").attr("x1", m.left).attr("x2", W - m.right).attr("y1", y(0)).attr("y2", y(0));
  svg.append("text").attr("class", "ttl").attr("transform", "rotate(-90)").attr("x", -(m.top + H - m.bottom) / 2).attr("y", 14).attr("text-anchor", "middle").text("H+AI minus best solo (percentage points)");
  groups.forEach((g, k) => {
    const rs = rows.filter((e) => e.Baseline === g.key), v = rs.map((e) => e.margin_pp).sort(d3.ascending), cx = x(g.key) + x.bandwidth() / 2, bw = Math.min(180, x.bandwidth() * 0.55);
    svg.append("text").attr("class", "ttl").attr("x", cx).attr("y", H - 30).attr("text-anchor", "middle").text(g.label);
    svg.append("text").attr("class", "sub").attr("x", cx).attr("y", H - 12).attr("text-anchor", "middle").text(`n = ${rs.length}${rs.length ? ` · median ${d3.median(v) > 0 ? "+" : "−"}${Math.abs(d3.median(v)).toFixed(1)} pp` : ""}`);
    if (!rs.length) return;
    const q1 = d3.quantile(v, 0.25), q2 = d3.quantile(v, 0.5), q3 = d3.quantile(v, 0.75), iqr = q3 - q1;
    const w0 = d3.min(v.filter((t) => t >= q1 - 1.5 * iqr)), w1 = d3.max(v.filter((t) => t <= q3 + 1.5 * iqr)), cls = k ? "src-new" : "src-vaccaro";
    const col = k ? "var(--accent)" : "var(--ink-2)";
    svg.append("line").attr("stroke", col).attr("stroke-width", 1.4).attr("x1", cx).attr("x2", cx).attr("y1", y(w0)).attr("y2", y(w1));
    svg.append("rect").attr("class", "box").attr("fill", col).attr("stroke", col).attr("x", cx - bw / 2).attr("width", bw).attr("y", y(q3)).attr("height", Math.max(1, y(q1) - y(q3))).attr("rx", 3);
    svg.append("line").attr("stroke", col).attr("stroke-width", 2.6).attr("x1", cx - bw / 2).attr("x2", cx + bw / 2).attr("y1", y(q2)).attr("y2", y(q2));
    const order = [...rs].sort((a, b) => (a.source === "new") - (b.source === "new"));
    const pts = svg.append("g").selectAll("path").data(order).join("path").attr("d", shape)
      .attr("class", (e) => `pt2 src-${e.source}${e.source === "new" && e.status !== "verified" ? " unverified" : ""}`)
      .attr("transform", (e) => `translate(${cx + (hash01(e.uid) - 0.5) * bw * 1.5},${y(e.margin_pp)})`);
    tips.mark(pts, say);
  });
}

export function renderThreshold(ctx) {
  const root = document.querySelector("#threshold"); root.innerHTML = "";
  const rows = rowsOf(ctx).filter((e) => e.ai_adv_pp != null).sort((a, b) => a.ai_adv_pp - b.ai_adv_pp), CLIP = 30;
  const W = widthOf(root) - 28, H = 420, m = { top: 34, right: 60, bottom: 50, left: 60 };
  const svg = svgIn(root, W, H, "Cumulative share of cases where AI alone beats the team");
  const x = d3.scaleLinear().domain([-CLIP, CLIP]).range([m.left, W - m.right]), y = d3.scaleLinear().domain([0, 1]).range([H - m.bottom, m.top]);
  svg.append("rect").attr("class", "half-h").attr("x", m.left).attr("y", m.top).attr("width", x(0) - m.left).attr("height", H - m.top - m.bottom);
  svg.append("rect").attr("class", "half-a").attr("x", x(0)).attr("y", m.top).attr("width", W - m.right - x(0)).attr("height", H - m.top - m.bottom);
  svg.append("text").attr("class", "sub").attr("x", (m.left + x(0)) / 2).attr("y", m.top - 10).attr("text-anchor", "middle").text("Human alone stronger");
  svg.append("text").attr("class", "sub").attr("x", (x(0) + W - m.right) / 2).attr("y", m.top - 10).attr("text-anchor", "middle").text("AI alone stronger");
  svg.append("g").attr("class", "grid").attr("transform", `translate(${m.left},0)`).call(d3.axisLeft(y).ticks(4).tickSize(-(W - m.left - m.right)).tickFormat(""));
  svg.append("g").attr("class", "ax").attr("transform", `translate(${m.left},0)`).call(d3.axisLeft(y).ticks(4).tickFormat(d3.format(".0%")));
  svg.append("g").attr("class", "ax").attr("transform", `translate(0,${H - m.bottom})`).call(d3.axisBottom(x).ticks(7).tickFormat((v) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v)}`));
  svg.append("line").attr("class", "ref").attr("x1", m.left).attr("x2", W - m.right).attr("y1", y(0.5)).attr("y2", y(0.5));
  svg.append("line").attr("stroke", "var(--axis)").attr("x1", x(0)).attr("x2", x(0)).attr("y1", m.top).attr("y2", H - m.bottom);
  svg.append("text").attr("class", "ttl").attr("x", (m.left + W - m.right) / 2).attr("y", H - 10).attr("text-anchor", "middle").text("AI alone minus human alone (percentage points)");
  svg.append("text").attr("class", "ttl").attr("transform", "rotate(-90)").attr("x", -(m.top + H - m.bottom) / 2).attr("y", 14).attr("text-anchor", "middle").text("Share where AI alone beats H+AI");
  if (!rows.length) return;
  let wins = 0; const pts = rows.map((e, i) => { if (e.ai_p > e.hai_p) wins += 1; return { x: e.ai_adv_pp, y: wins / (i + 1) }; });
  const shown = pts.filter((p) => p.x >= -CLIP && p.x <= CLIP), overall = wins / rows.length;
  svg.append("path").attr("class", "line").attr("d", d3.line().x((p) => x(p.x)).y((p) => y(p.y)).curve(d3.curveStepAfter)(shown));
  const last = shown[shown.length - 1];
  if (last) svg.append("text").attr("x", Math.min(x(last.x) + 6, W - 4)).attr("y", y(last.y) - 8).attr("text-anchor", "end").attr("fill", "var(--accent)").attr("font-weight", 600).text(`Overall: ${(100 * overall).toFixed(1)}%`);
  const nl = rows.filter((e) => e.ai_adv_pp < -CLIP).length, nr = rows.filter((e) => e.ai_adv_pp > CLIP).length;
  svg.append("text").attr("class", "sub").attr("x", W - m.right).attr("y", 12).attr("text-anchor", "end")
    .text(`n = ${rows.length} · ${nl} with a human lead over ${CLIP} pp and ${nr} with an AI lead over ${CLIP} pp not drawn (they count in the overall share)`);
}

export function descTable(ctx) {
  const rows = rowsOf(ctx).sort((a, b) => (b.source === "new") - (a.source === "new") || a.paper.localeCompare(b.paper));
  document.querySelector("#desc-table").innerHTML = `<div class="tbl"><table><thead><tr><th>Source</th><th>Study</th><th>Condition</th><th>Metric</th><th>Human</th><th>AI</th><th>H+AI</th><th>vs best alone</th></tr></thead><tbody>`
    + rows.map((e) => `<tr><td>${SRC_SHORT[e.source]}</td><td>${esc(e.paper)}</td><td>${esc((e.condition || "").slice(0, 60))}</td><td>${esc((e.metric || "").slice(0, 44))}</td>`
      + `<td class="n">${P(e.human_p)}</td><td class="n">${P(e.ai_p)}</td><td class="n">${P(e.hai_p)}</td><td class="n">${e.margin_pp > 0 ? "+" : "−"}${Math.abs(e.margin_pp).toFixed(1)} pp</td></tr>`).join("") + `</tbody></table></div>`;
}

// ── who is most often the worst of the three? (all comparisons; ties count for each) ───────────────
const wilson = (x, n) => { if (!n) return [0, 0]; const z = 1.959964, p = x / n, d = 1 + z * z / n, c = p + z * z / (2 * n), h = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)); return [(c - h) / d, (c + h) / d]; };
export function renderWorst(ctx) {
  const root = document.querySelector("#worst"); root.innerHTML = "";
  document.querySelector("#worst-legend").innerHTML = legendHtml();
  const tips = ctx.tips(null), arms = [["worst_human", "Human alone"], ["worst_ai", "AI alone"], ["worst_team", "H+AI team"]], srcs = sources(ctx);
  const W = widthOf(root) - 28, H = 380, m = { top: 26, right: 16, bottom: 54, left: 58 }, svg = svgIn(root, W, H, "Who is most often the worst performer?");
  const x = d3.scaleBand().domain(arms.map((a) => a[0])).range([m.left, W - m.right]).padding(0.3), x1 = d3.scaleBand().domain(srcs).range([0, x.bandwidth()]).padding(0.12);
  const y = d3.scaleLinear().domain([0, 0.8]).range([H - m.bottom, m.top]);
  svg.append("g").attr("class", "grid").attr("transform", `translate(${m.left},0)`).call(d3.axisLeft(y).ticks(4).tickSize(-(W - m.left - m.right)).tickFormat(""));
  svg.append("g").attr("class", "ax").attr("transform", `translate(${m.left},0)`).call(d3.axisLeft(y).ticks(4).tickFormat(d3.format(".0%")));
  svg.append("text").attr("class", "ttl").attr("transform", "rotate(-90)").attr("x", -(m.top + H - m.bottom) / 2).attr("y", 14).attr("text-anchor", "middle").text("Share of comparisons");
  for (const [key, label] of arms) {
    svg.append("text").attr("class", "ttl").attr("x", x(key) + x.bandwidth() / 2).attr("y", H - 28).attr("text-anchor", "middle").text(label);
    for (const s of srcs) {
      const rows = ctx.effects.filter((e) => e.source === s), k = rows.filter((e) => e[key]).length, p = rows.length ? k / rows.length : 0, [lo, hi] = wilson(k, rows.length);
      const bx = x(key) + x1(s), bw = x1.bandwidth();
      const bar = svg.append("rect").attr("class", `src-${s}`).attr("stroke", "none").attr("fill-opacity", 0.85).attr("x", bx).attr("width", bw).attr("y", y(p)).attr("height", y(0) - y(p)).attr("rx", 3).datum({ s, k, n: rows.length, p, lo, hi });
      svg.append("line").attr("stroke", "var(--ink)").attr("x1", bx + bw / 2).attr("x2", bx + bw / 2).attr("y1", y(Math.min(0.8, hi))).attr("y2", y(lo));
      svg.append("text").attr("x", bx + bw / 2).attr("y", y(Math.min(0.8, hi)) - 6).attr("text-anchor", "middle").attr("font-weight", 600).text(`${(100 * p).toFixed(0)}%`);
      tips.mark(bar, (b) => ({ title: `${label} is the worst of the three`, subtitle: SRC[b.s], values: [{ label: "share", text: `${(100 * b.p).toFixed(1)}%` }, { label: "comparisons", text: `${b.k} of ${b.n}` }, { label: "95% CI (Wilson)", text: `${(100 * b.lo).toFixed(0)}–${(100 * b.hi).toFixed(0)}%` }] }));
    }
  }
  svg.append("text").attr("class", "sub").attr("x", W - m.right).attr("y", 12).attr("text-anchor", "end")
    .text(srcs.map((s) => `${s === "vaccaro" ? "Vaccaro" : "GenAI"}: n = ${ctx.effects.filter((e) => e.source === s).length}`).join(" · ") + " · error bars: 95% Wilson interval · ties count for each");
}

// ── the AI's lead in 5-point bins (AI-stronger comparisons): how often does the team still beat the AI alone? ──
export function renderBins(ctx) {
  const root = document.querySelector("#bins"); root.innerHTML = "";
  document.querySelector("#bins-legend").innerHTML = legendHtml() + `<span class="muted">pale = fewer than 10 comparisons</span>`;
  const tips = ctx.tips(null), srcs = sources(ctx), edges = d3.range(0, 50, 5);
  const binOf = (g) => (g > 0 && g <= 50 ? (Math.ceil(+g.toFixed(9) / 5) - 1) * 5 : null);              // (a, b] bins, as R's cut() makes them
  const cell = (s, b) => { const rows = ctx.effects.filter((e) => e.source === s && e.prop && e.Baseline === "AI" && binOf(e.ai_adv_pp) === b); return { s, b, n: rows.length, k: rows.filter((e) => e.team_vs_ai > 0).length, ties: rows.filter((e) => e.team_vs_ai === 0).length }; };
  const W = widthOf(root) - 28, H = 400, m = { top: 46, right: 16, bottom: 54, left: 58 }, svg = svgIn(root, W, H, "Team beats AI alone, by the AI's lead");
  const x = d3.scaleBand().domain(edges).range([m.left, W - m.right]).padding(0.22), x1 = d3.scaleBand().domain(srcs).range([0, x.bandwidth()]).padding(0.1), y = d3.scaleLinear().domain([0, 1]).range([H - m.bottom, m.top]);
  svg.append("g").attr("class", "grid").attr("transform", `translate(${m.left},0)`).call(d3.axisLeft(y).ticks(4).tickSize(-(W - m.left - m.right)).tickFormat(""));
  svg.append("g").attr("class", "ax").attr("transform", `translate(${m.left},0)`).call(d3.axisLeft(y).ticks(4).tickFormat(d3.format(".0%")));
  svg.append("line").attr("class", "ref").attr("x1", m.left).attr("x2", W - m.right).attr("y1", y(0.5)).attr("y2", y(0.5));
  svg.append("text").attr("class", "ttl").attr("transform", "rotate(-90)").attr("x", -(m.top + H - m.bottom) / 2).attr("y", 14).attr("text-anchor", "middle").text("Team beats AI alone");
  svg.append("text").attr("class", "ttl").attr("x", (m.left + W - m.right) / 2).attr("y", H - 8).attr("text-anchor", "middle").text("AI’s lead over the human alone (percentage points)");
  for (const b of edges) {
    svg.append("text").attr("class", "sub").attr("x", x(b) + x.bandwidth() / 2).attr("y", H - 34).attr("text-anchor", "middle").text(`${b}–${b + 5}`);
    for (const s of srcs) {
      const c = cell(s, b); if (!c.n) continue;
      const p = c.k / c.n, bx = x(b) + x1(s), bw = x1.bandwidth();
      const bar = svg.append("rect").attr("class", `src-${s}`).attr("stroke", "none").attr("fill-opacity", c.n < 10 ? 0.35 : 0.85).attr("x", bx).attr("width", bw).attr("y", y(p) - (p ? 0 : 2)).attr("height", Math.max(2, y(0) - y(p))).attr("rx", 2).datum(c);
      svg.append("text").attr("class", "sub").attr("x", bx + bw / 2).attr("y", y(p) - 6).attr("text-anchor", "middle").text(`n=${c.n}`);
      tips.mark(bar, (q) => ({ title: `AI lead of ${q.b}–${q.b + 5} pp`, subtitle: SRC[q.s], values: [{ label: "team beats AI alone", text: `${(100 * q.k / q.n).toFixed(1)}%` }, { label: "comparisons", text: `${q.k} of ${q.n}${q.ties ? ` (${q.ties} tie${q.ties === 1 ? "" : "s"})` : ""}` }],
        note: q.n < 10 ? "Fewer than 10 comparisons: read with caution." : undefined }));
    }
  }
  svg.append("text").attr("class", "sub").attr("x", W - m.right).attr("y", 12).attr("text-anchor", "end").text("leads above 50 pp not drawn");
  // the same as a table
  document.querySelector("#bins-table").innerHTML = `<div class="tbl"><table><thead><tr><th>AI lead (pp)</th>${srcs.map((s) => `<th>${SRC_SHORT[s]}: n</th><th>team beats AI alone</th>`).join("")}</tr></thead><tbody>`
    + edges.map((b) => `<tr><td>${b}–${b + 5}</td>${srcs.map((s) => { const c = cell(s, b); return `<td class="n">${c.n}</td><td class="n">${c.n ? `${(100 * c.k / c.n).toFixed(1)}%` : "–"}</td>`; }).join("")}</tr>`).join("") + `</tbody></table></div>`;
}
