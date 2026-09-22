#!/usr/bin/env python3
"""Render preview.png (the page's card image for Metalens and social links).

    python3 scripts/preview.py [base url]      # default: a local server on port 8765

Needs Playwright with Chrome (pip install playwright; it uses the system Chrome). Renders
scripts/preview.html — the synergy effect sizes drawn as a field of strokes — at 1200x630, the
size link previews expect. It is data-driven: rerun it after a rebuild and the picture follows.
"""
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

base = (sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8765").rstrip("/")
out = Path(__file__).resolve().parents[1] / "preview.png"
with sync_playwright() as pw:
    try:
        b = pw.chromium.launch(channel="chrome", headless=True)      # the system Chrome …
    except Exception:
        b = pw.chromium.launch(headless=True)                        # … or Playwright's own (the Action)
    pg = b.new_context(viewport={"width": 1200, "height": 630}, device_scale_factor=2).new_page()
    pg.goto(f"{base}/scripts/preview.html"); pg.wait_for_selector("body[data-ready]", timeout=30000); pg.wait_for_timeout(500)
    pg.screenshot(path=str(out), clip={"x": 0, "y": 0, "width": 1200, "height": 630}, scale="css")
    b.close()
print(f"wrote {out}")
