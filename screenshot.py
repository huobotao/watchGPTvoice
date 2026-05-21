import asyncio, os
from playwright.async_api import async_playwright

URL = "file://" + os.path.abspath("athro-preview.html")
OUT = "screens"
os.makedirs(OUT, exist_ok=True)

# iPhone 14 Pro size
VIEW = {"width": 393, "height": 852}
DPR  = 3

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        ctx = await browser.new_context(
            viewport=VIEW,
            device_scale_factor=DPR,
            is_mobile=True,
            has_touch=True,
            user_agent=("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) "
                        "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 "
                        "Mobile/15E148 Safari/604.1"),
        )
        # Force standalone display mode so the page renders like an installed PWA
        await ctx.add_init_script(
            "Object.defineProperty(window.navigator, 'standalone', {value: true});"
        )

        # ── Shot 1: Top of dashboard (AKL active)
        page = await ctx.new_page()
        await page.emulate_media(media="screen", color_scheme="dark")
        await page.goto(URL)
        await page.evaluate("document.documentElement.classList.add('is-pwa')")
        await page.wait_for_timeout(700)
        await page.screenshot(path=f"{OUT}/01-dashboard-akl.png", full_page=False)

        # ── Shot 2: CHC selected
        await page.click(".city-tab[data-city='CHC']")
        await page.wait_for_timeout(400)
        await page.screenshot(path=f"{OUT}/02-dashboard-chc.png", full_page=False)

        # ── Shot 3: ZQN selected
        await page.click(".city-tab[data-city='ZQN']")
        await page.wait_for_timeout(400)
        await page.screenshot(path=f"{OUT}/03-dashboard-zqn.png", full_page=False)

        # ── Shot 4: Scrolled to "我的目的地 + 命中规则"
        await page.click(".city-tab[data-city='AKL']")
        await page.wait_for_timeout(300)
        await page.evaluate("window.scrollTo(0, 760)")
        await page.wait_for_timeout(300)
        await page.screenshot(path=f"{OUT}/04-destinations-rules.png", full_page=False)

        # ── Shot 5: Day detail bottom sheet open (best day = idx 3 for AKL)
        await page.evaluate("window.scrollTo(0, 0)")
        await page.wait_for_timeout(200)
        await page.evaluate("document.querySelectorAll('.day')[3].click()")
        await page.wait_for_timeout(500)
        await page.screenshot(path=f"{OUT}/05-day-detail-sheet.png", full_page=False)

        # ── Shot 6: Full page tall composite (everything in one scroll)
        await page.evaluate("document.getElementById('sheetClose').click()")
        await page.wait_for_timeout(300)
        await page.screenshot(path=f"{OUT}/06-full-scroll.png", full_page=True)

        await browser.close()

asyncio.run(run())
print("done")
