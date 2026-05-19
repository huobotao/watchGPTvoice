#!/usr/bin/env python3
"""
Create a self-contained "loaded" HTML viewer with the user's CSV data baked in.
Output: wechat_viewer_loaded.html — double-click → already shows the chats, no drag needed.
"""
import csv
import json
import sys
from pathlib import Path

HERE = Path(__file__).parent

def main():
    if len(sys.argv) != 3:
        print("Usage: bundle_with_data.py <csv_path> <output_html>", file=sys.stderr)
        sys.exit(2)

    csv_path = Path(sys.argv[1])
    out_path = Path(sys.argv[2])

    # Read CSV → list of dicts
    with open(csv_path, newline="", encoding="utf-8") as fp:
        rows = list(csv.DictReader(fp))
    print(f"[*] Loaded {len(rows)} rows from {csv_path.name}")
    if rows:
        print(f"    columns: {list(rows[0].keys())}")

    # Read source files
    index_html = (HERE / "index.html").read_text()
    css        = (HERE / "viewer.css").read_text()
    js         = (HERE / "viewer.js").read_text()
    papa       = Path("/tmp/papaparse.min.js").read_text()

    # Inline CSS / JS / Papa
    html = index_html.replace(
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

    # Inject the data + auto-load hook (runs after viewer.js's DOMContentLoaded)
    data_json = json.dumps(rows, ensure_ascii=False)
    bootstrap = f"""
<script>
// === Pre-loaded data ===
window.__PRELOADED_DATA__ = {data_json};
window.__PRELOADED_SOURCE__ = {json.dumps(csv_path.name)};

document.addEventListener("DOMContentLoaded", () => {{
  // Wait for viewer.js's own DOMContentLoaded to wire setupDropZone/setupApp
  setTimeout(() => {{
    try {{
      const rows = window.__PRELOADED_DATA__;
      const source = window.__PRELOADED_SOURCE__;
      const normalized = normalizeRows(rows, source);
      if (!normalized.length) {{
        document.getElementById("loader-status").classList.remove("hidden");
        document.getElementById("loader-status").textContent = "预加载数据为空";
        return;
      }}
      STATE.messages = normalized;
      rebuildConversations();
      showApp();
      // Auto-select the conversation with most messages
      if (STATE.conversations.length) {{
        const top = STATE.conversations.reduce((a, b) => a.count > b.count ? a : b);
        selectConversation(top.id);
      }}
    }} catch (e) {{
      console.error("Preload failed:", e);
      const s = document.getElementById("loader-status");
      s.classList.remove("hidden");
      s.classList.add("error");
      s.textContent = "预加载失败: " + e.message;
    }}
  }}, 50);
}});
</script>
"""
    # Insert just before </body>
    html = html.replace("</body>", bootstrap + "\n</body>")

    out_path.write_text(html, encoding="utf-8")
    print(f"[+] Wrote {out_path} ({out_path.stat().st_size:,} bytes)")
    print(f"    Double-click to open — data already loaded, no drag needed.")

if __name__ == "__main__":
    main()
