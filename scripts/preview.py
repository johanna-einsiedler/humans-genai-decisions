#!/usr/bin/env python3
"""Render preview.png (the page's card image for Metalens and social links) from the live page.

    python3 scripts/preview.py [url]      # default: a local server on port 8765

Needs Playwright with Chrome (pip install playwright; it uses the system Chrome). Captures the
first figure section at 1200x630 — the size link previews expect.
"""
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

url = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8765/index.html"
out = Path(__file__).resolve().parents[1] / "preview.png"
with sync_playwright() as pw:
    b = pw.chromium.launch(channel="chrome", headless=True)
    pg = b.new_context(viewport={"width": 1200, "height": 630}, device_scale_factor=2).new_page()
    pg.goto(url); pg.wait_for_selector("#forest svg", timeout=30000); pg.wait_for_timeout(1500)
    # the two forest panels, nothing else: the chart IS the preview
    box = pg.locator("#forest").bounding_box()
    pg.evaluate(f"window.scrollTo(0, {box['y'] - 12})"); pg.wait_for_timeout(300)
    b2 = pg.locator("#forest").bounding_box(); w = b2["width"]; h = w * 630 / 1200
    pg.screenshot(path=str(out), clip={"x": b2["x"], "y": b2["y"], "width": w, "height": min(h, b2["height"])}, scale="css")
    b.close()
print(f"wrote {out}")
