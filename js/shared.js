// names and links used across the page, and what a hovered mark says
export const DOI = "https://doi.org/10.1038/s41562-024-02024-1";
export const VAC = `<a href="${DOI}" target="_blank" rel="noopener">Vaccaro et al. (2024)</a>`;          // every mention links to the paper
export const SRC = { vaccaro: "Vaccaro et al. (2024), decision tasks", new: "GenAI studies (Metalens dataset)" };
export const SRC_HTML = { vaccaro: `${VAC}, decision tasks`, new: "GenAI studies (Metalens dataset)" };
export const SRC_SHORT = { vaccaro: "Vaccaro", new: "Metalens – GenAI" };                                   // in tables
export const legendHtml = () => Object.keys(SRC).map((k) => `<span><span class="sw" style="background:var(--${k})"></span><em>${SRC_HTML[k]}</em></span>`).join("");

// the three scores of a comparison as evidence columns: which release column, what it is called, its value
export const scoreColumns = (e, withSd) => [
  { column: "Avg_Perf_HumanAI", label: "human + AI", value: e.hai }, { column: "Avg_Perf_Human", label: "human alone", value: e.human },
  { column: "Avg_Perf_AI", label: "AI alone", value: e.ai },
  ...(withSd ? [{ column: "Sd_Perf_HumanAI", label: "SD human + AI" }, { column: "Sd_Perf_Human", label: "SD human alone" }] : [])];

// a GenAI-study row carries its Metalens evidence, a row of Vaccaro et al. its reference
export function describe(e, values, columns) {
  const base = { title: e.paper, subtitle: e.title, values, detail: [e.task, e.condition, e.metric].filter(Boolean).join(" · ").slice(0, 220) };
  if (e.source === "new") return { ...base, status: e.status, rows: [{ row: e.row }], columns };
  return { ...base, note: "From the published dataset of Vaccaro, Almaatouq & Malone (2024)." };
}
