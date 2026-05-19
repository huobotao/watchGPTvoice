#!/usr/bin/env python3
"""
Bundle index.html + viewer.css + viewer.js + papaparse.min.js into a single
self-contained HTML file. Result is double-clickable, fully offline.
"""
from pathlib import Path

HERE = Path(__file__).parent
INDEX = HERE / "index.html"
CSS   = HERE / "viewer.css"
JS    = HERE / "viewer.js"
PAPA  = Path("/tmp/papaparse.min.js")  # fetched once from CDN
OUT   = HERE / "wechat_viewer.html"

html = INDEX.read_text()
css  = CSS.read_text()
js   = JS.read_text()
papa = PAPA.read_text()

# Replace external links with inline content
html = html.replace(
    '<link rel="stylesheet" href="viewer.css">',
    f'<style>\n{css}\n</style>'
)
html = html.replace(
    '<script src="https://cdn.jsdelivr.net/npm/papaparse@5.4.1/papaparse.min.js"></script>',
    f'<script>\n{papa}\n</script>'
)
html = html.replace(
    '<script src="viewer.js"></script>',
    f'<script>\n{js}\n</script>'
)

OUT.write_text(html)
print(f"Wrote {OUT} ({OUT.stat().st_size:,} bytes)")
