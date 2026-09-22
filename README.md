# Humans, AI, and the two together — a living meta-analysis of decision tasks

A single static page that extends Vaccaro, Almaatouq & Malone (2024, *Nature Human Behaviour*) with new
experiments on generative AI. The new studies come from a **Metalens release**: a frozen, human-checked
dataset exported as static files. The page reads those files directly; there is no server.

## Look at it

    python3 -m http.server 8765        # in this folder, then open http://127.0.0.1:8765

## What is where

| | |
|---|---|
| `text.md` | **the written parts of the page** (summary, lede). Edit here. `{placeholders}` are filled with the current numbers; `written_for` records the conclusions the text assumes — when a rebuild finds different ones the page shows a review notice until the text is updated |
| `index.html`, `css/`, `js/` | the page: summary, forest plot (Fig. 1 style), subgroups (Fig. 2 style), scatter, worst performer, margin, threshold, lead-by-bin, methods |
| `lib/metalens-dash.js` | reads a Metalens release and gives D3 marks the evidence tooltip (paper, status, quoted passage, table / row / page) |
| `lib/d3.v7.min.js` | D3, vendored |
| `data/vaccaro.csv` | the paper's 370 effect sizes (authors' OSF repository, CC BY 4.0) |
| `data/<release folder>/` | the Metalens release: `release.json`, `tables/*.json`, `evidence.json`, `README.md` |
| `scripts/fetch_release.py` | fetches the latest (or a pinned) release from `metalens-datasets` into `data/` |
| `data/config.json` | `source`: the dataset in `metalens-datasets` · `release`: which release folder the page uses · `dataset_label`: how the dataset is called on the page · `genai_blurb`: the one sentence of the summary that describes the GenAI studies (the only hand-written statement about them; update it when the mix of studies changes) |
| `data/derived.json` | everything computed: effect sizes, pooled and subgroup estimates, descriptive fields. **Built, do not edit** |
| `analysis/build.R` | builds `derived.json` exactly as the paper's analysis script (metafor) |
| `analysis/validate.R` | shows that the method reproduces the paper's published estimates |
| `.github/workflows/update.yml` | rebuilds and deploys on GitHub when `data/` changes |

## Updates

The page follows the dataset published in `metalens-datasets` (`data/config.json` → `source`):

- **automatically**: the GitHub workflow runs daily (and on demand: Actions → *update dashboard* → *Run workflow*), reads `releases/latest.json` of the dataset, fetches a new release into `data/`, reruns the R analysis, commits and redeploys the page. If a conclusion in `text.md` no longer holds, the page shows a review notice.
- **by hand**: `python3 scripts/fetch_release.py` (add `--pin N` for a specific release), then `Rscript analysis/build.R`.
- **from a downloaded zip** (a release that is not on GitHub):

1. In Metalens: dataset page → Release history → **⬇ files** of the new release; unzip into `data/`.
2. Put the folder name into `data/config.json`.
3. `Rscript analysis/build.R` (needs R with `metafor`, `clubSandwich`, `jsonlite`). It stops with a clear
   message if the release no longer has a column the page needs. On GitHub the workflow does this step.
4. Reload. The text, the numbers in it and all figures follow the new data.

## Rules the page applies (also stated on the page)

Decision tasks only · a comparison needs a human-alone, an AI-alone and a human+AI score · Hedges' g needs
the SDs and Ns (rows without them are left out of the forest and subgroup figures) · subgroup rows appear
only when the new studies have ≥ 4 effect sizes from ≥ 2 experiments and the paper has that level ·
the three descriptive figures use proportion-scale outcomes (0–100 accuracy / percent scores ÷ 100).
