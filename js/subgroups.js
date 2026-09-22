// Fig. 2 of the paper with two lines per row: the paper's decision-task experiments and the new
// studies. Only rows the new studies can support are present (analysis/build.R decides).
import { svgIn, widthOf, esc } from "../lib/metalens-dash.js";
import { SRC, legendHtml } from "./shared.js";
const d3 = window.d3;

export function renderSubgroups(ctx) {
  const root = document.querySelector("#subgroups"); root.innerHTML = "";
  document.querySelector("#sub-legend").innerHTML = legendHtml();
  const { d } = ctx, tips = ctx.tips(null);
  const rows = [{ head: null, level: "All effect sizes", est: (o, s) => d.pooled.find((p) => p.outcome === o && p.source === s) }];
  const mods = [...new Set(d.subgroups.map((s) => s.moderator))];
  for (const mname of mods) {
    rows.push({ head: mname });
    for (const lvl of [...new Set(d.subgroups.filter((s) => s.moderator === mname).map((s) => s.level))])
      rows.push({ level: lvl, est: (o, s) => d.subgroups.find((x) => x.moderator === mname && x.level === lvl && x.outcome === o && x.source === s) });
  }
  const W = widthOf(root) - 28, rowH = 34, headH = 26, m = { top: 50, bottom: 46 };
  const labelW = Math.min(230, W * 0.26), kW = 84, gap = 22, plotW = (W - labelW - kW - 2 * gap) / 2;
  let yy = m.top; rows.forEach((r) => { r.y = yy; yy += r.head ? headH : rowH; });
  const H = yy + m.bottom, svg = svgIn(root, W, H, "Average effects by subgroup");
  const all = d.subgroups.concat(d.pooled).filter((s) => s.g != null);
  const lim = Math.min(2, Math.max(1, Math.ceil(10 * d3.max(all, (s) => Math.max(Math.abs(s.lo), Math.abs(s.hi)))) / 10));
  svg.append("text").attr("class", "sub").attr("x", 0).attr("y", 30).text("Subgroup");
  svg.append("text").attr("class", "sub").attr("x", labelW + kW - 8).attr("y", 30).attr("text-anchor", "end").text("k Vaccaro / GenAI");
  [["s", "Human–AI synergy"], ["h", "Human augmentation"]].forEach(([o, title], k) => {
    const x0 = labelW + kW + gap + k * (plotW + gap), x = d3.scaleLinear().domain([-lim, lim]).range([x0, x0 + plotW]).clamp(true);
    svg.append("text").attr("class", "ttl").attr("x", x0 + plotW / 2).attr("y", 16).attr("text-anchor", "middle").text(title);
    svg.append("text").attr("class", "sub").attr("x", x0 + plotW / 2).attr("y", 32).attr("text-anchor", "middle").text("Hedges’ g with 95% CI");
    svg.append("line").attr("stroke", "var(--ink)").attr("x1", x(0)).attr("x2", x(0)).attr("y1", m.top - 6).attr("y2", yy);
    svg.append("g").attr("class", "ax").attr("transform", `translate(0,${yy + 4})`).call(d3.axisBottom(x).ticks(5).tickFormat((v) => String(v).replace("-", "−")));
    svg.append("text").attr("class", "sub").attr("x", x(-lim)).attr("y", H - 6).text("← worse than baseline");
    svg.append("text").attr("class", "sub").attr("x", x(lim)).attr("y", H - 6).attr("text-anchor", "end").text("better →");
    for (const r of rows) {
      if (r.head) continue;
      ["vaccaro", "new"].forEach((s, j) => {
        const p = r.est(o, s); if (!p || p.g == null) return;
        const y = r.y + rowH / 2 + (j ? 6 : -6);
        const line = svg.append("line").attr("class", `pooled src-${s}`).style("stroke-width", 1.8).attr("x1", x(p.lo)).attr("x2", x(p.hi)).attr("y1", y).attr("y2", y);
        const dot = svg.append("circle").attr("class", `src-${s}`).attr("cx", x(p.g)).attr("cy", y).attr("r", 4.2).datum(p);
        if (p.lo < -lim) svg.append("text").attr("x", x0 - 2).attr("y", y + 4).attr("text-anchor", "end").attr("fill", `var(--${s})`).text("‹");
        if (p.hi > lim) svg.append("text").attr("x", x0 + plotW + 2).attr("y", y + 4).attr("fill", `var(--${s})`).text("›");
        tips.mark(dot, () => ({ title: `${r.level}${r.head === null ? "" : ""}`, subtitle: SRC[s],
          values: [{ label: "g", value: p.g, text: `${p.g.toFixed(2)} (${p.lo.toFixed(2)} to ${p.hi.toFixed(2)})` }, { label: "k", value: p.k, text: `${p.k} effect sizes, ${p.n_exp} experiments` }],
          note: title })); line.lower();
      });
    }
  });
  for (const r of rows) {
    if (r.head) { svg.append("text").attr("class", "ttl").attr("x", 0).attr("y", r.y + 18).text(r.head); continue; }
    svg.insert("rect", ":first-child").attr("class", "band").attr("x", 0).attr("y", r.y + 2).attr("width", W).attr("height", rowH - 4).attr("rx", 4);
    svg.append("text").attr("x", r.head === null ? 0 : 12).attr("y", r.y + rowH / 2 + 4).text(r.level);
    const a = r.est("s", "vaccaro"), b = r.est("s", "new");
    svg.append("text").attr("x", labelW + kW - 8).attr("y", r.y + rowH / 2 + 4).attr("text-anchor", "end").text(`${a ? a.k : "–"} / ${b ? b.k : "–"}`);
  }
  const om = d.omitted, by = {}; om.forEach((o) => { (by[o.moderator] = by[o.moderator] || []).push(o.level); });
  document.querySelector("#sub-note").textContent = `Left out because the GenAI studies have fewer than ${d.meta.rule.min_k} effect sizes from ${d.meta.rule.min_exp} experiments there, or Vaccaro et al. have no such experiments: `
    + Object.entries(by).map(([k, v]) => `${k} (${v.join(", ")})`).join("; ") + ". Intervals that run past the axis are marked with ‹ or ›.";
}
