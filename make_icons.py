import asyncio, os, base64
from playwright.async_api import async_playwright

SVG = open('athro-icon.svg').read()
SIZES = [180, 167, 152, 120, 1024]
os.makedirs("icons", exist_ok=True)

# Wrap the SVG in an HTML page so playwright can rasterize it at the right size
def make_html(svg: str, px: int) -> str:
    return f"""<!doctype html><html><body style="margin:0;background:transparent">
<div style="width:{px}px;height:{px}px">{svg.replace('<svg ', f'<svg width="{px}" height="{px}" ')}</div>
</body></html>"""

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        for size in SIZES:
            page = await browser.new_page(viewport={"width": size, "height": size})
            await page.set_content(make_html(SVG, size))
            await page.wait_for_timeout(120)
            png_bytes = await page.locator("div").screenshot(omit_background=False)
            out = f"icons/icon-{size}.png"
            with open(out, "wb") as f:
                f.write(png_bytes)
            print(f"wrote {out}  ({len(png_bytes)} B)")
            await page.close()
        await browser.close()

asyncio.run(run())
