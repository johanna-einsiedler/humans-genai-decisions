#!/usr/bin/env python3
"""Fetch the latest release of the dataset from the metalens-datasets repository into data/.

    python3 scripts/fetch_release.py            # follow releases/latest.json
    python3 scripts/fetch_release.py --pin 3    # a specific release

Reads data/config.json: `source` = {repo, dataset, ref}. Writes data/<dataset>-vN/ (the release
files) and points config.release at it. Exits 0 with "up to date" when nothing changed, 3 when a
new release was fetched (the workflow uses that to decide whether to rebuild). Never deletes older
release folders: the page can be pinned back by editing config.release.
"""
import argparse, json, sys, urllib.error, urllib.request
from pathlib import Path

root = Path(__file__).resolve().parents[1]
cfg_path = root / "data" / "config.json"
cfg = json.loads(cfg_path.read_text())
src = cfg.get("source") or {}
ap = argparse.ArgumentParser(); ap.add_argument("--pin", type=int); a = ap.parse_args()
if not src.get("repo") or not src.get("dataset"):
    sys.exit("data/config.json needs source.repo (owner/name) and source.dataset (the folder under datasets/)")
def write_manifest(cfg, meta):
    """metalens.json next to index.html: what Metalens reads to learn which release this page shows."""
    (root / "metalens.json").write_text(json.dumps({
        "format": "metalens-dashboard", "dataset": cfg.get("source", {}).get("dataset"), "source_repo": cfg.get("source", {}).get("repo"),
        "release": cfg["release"], "release_number": meta["release"]["number"], "content_sha": meta["release"]["content_sha"],
        "release_created_at": meta["release"]["created_at"], "n_papers": meta.get("n_papers"), "doi": (meta.get("release") or {}).get("doi"), "preview": "preview.png",
        "description": cfg.get("description", ""), "authors": cfg.get("authors", ""),
        # the page's own keywords, or the dataset's as the release names them
        "keywords": cfg.get("keywords") or (meta.get("dataset") or {}).get("keywords") or []}, indent=2) + "\n")

base = f"https://raw.githubusercontent.com/{src['repo']}/{src.get('ref', 'main')}/datasets/{src['dataset']}"

def get(path):
    with urllib.request.urlopen(f"{base}/{path}", timeout=60) as r:
        return r.read()

try:
    latest = json.loads(get("releases/latest.json"))
except urllib.error.HTTPError as e:
    if e.code == 404:
        print(f"no releases published yet for {src['dataset']} in {src['repo']} (releases/latest.json not found); keeping {cfg.get('release')}"); sys.exit(0)
    raise
number = a.pin or latest["number"]
folder = f"{src['dataset']}-v{number}"
target = root / "data" / folder
if cfg.get("release") == folder and (target / "release.json").exists():
    # the same release — but its metadata may have moved on (a DOI minted after publication)
    have = json.loads((target / "release.json").read_text())
    if (have.get("release") or {}).get("doi") == latest.get("doi"):
        print(f"up to date: release v{number} ({latest.get('content_sha', '')[:8]})"); sys.exit(0)
    meta = json.loads(get(f"releases/v{number}/release.json"))
    (target / "release.json").write_bytes(json.dumps(meta, ensure_ascii=False, indent=1).encode("utf-8"))
    (target / "README.md").write_bytes(get(f"releases/v{number}/README.md"))
    write_manifest(cfg, meta)
    print(f"release v{number} unchanged, its DOI is now {meta['release'].get('doi')}; release.json refreshed"); sys.exit(3)
meta = json.loads(get(f"releases/v{number}/release.json"))
files = meta.get("files") or latest.get("files") or []
target.mkdir(parents=True, exist_ok=True)
for f in files:
    (target / f).parent.mkdir(parents=True, exist_ok=True)
    (target / f).write_bytes(get(f"releases/v{number}/{f}"))
cfg["release"] = folder
cfg_path.write_text(json.dumps(cfg, ensure_ascii=False, indent=2) + "\n")
write_manifest(cfg, meta)
print(f"fetched release v{number} ({meta['release']['content_sha'][:8]}, {meta['release']['created_at'][:10]}) into data/{folder}; config.release updated")
sys.exit(3)
