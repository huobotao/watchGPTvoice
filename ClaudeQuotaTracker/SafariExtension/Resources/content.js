// Runs on every claude.ai page. Scans for quota limit messages and
// sends the detected reset time to SafariWebExtensionHandler.

(function () {
  "use strict";

  let lastReportedTime = null;

  function parseResetDate(text) {
    // "Your usage limit will reset at 3:45 PM" (absolute time today)
    const absMatch = text.match(/reset[s]?\s+at\s+([\d]{1,2}:[\d]{2}\s*[AP]M)/i);
    if (absMatch) {
      const today = new Date();
      const parsed = new Date(`${today.toDateString()} ${absMatch[1]}`);
      // If the parsed time is already past, assume tomorrow
      if (parsed <= today) parsed.setDate(parsed.getDate() + 1);
      return parsed;
    }

    // "resets in 4 hours 52 minutes" (relative)
    const relMatch = text.match(/reset[s]?\s+in\s+(\d+)\s*h(?:ours?)?\s*(?:and\s+)?(\d+)?\s*m(?:in(?:utes?)?)?/i);
    if (relMatch) {
      const h = parseInt(relMatch[1] || "0", 10);
      const m = parseInt(relMatch[2] || "0", 10);
      return new Date(Date.now() + h * 3_600_000 + m * 60_000);
    }

    // "resets in 5 hours"
    const hoursOnly = text.match(/reset[s]?\s+in\s+(\d+)\s*h(?:ours?)?/i);
    if (hoursOnly) {
      return new Date(Date.now() + parseInt(hoursOnly[1], 10) * 3_600_000);
    }

    return null;
  }

  function scan() {
    const bodyText = document.body?.innerText || "";
    if (!/limit|quota|usage/i.test(bodyText)) return;

    const resetDate = parseResetDate(bodyText);
    if (!resetDate) return;

    const iso = resetDate.toISOString();
    if (iso === lastReportedTime) return; // avoid duplicate messages
    lastReportedTime = iso;

    safari.extension.dispatchMessage("quotaDetected", { resetTime: iso });
  }

  // Initial scan after DOM is ready
  scan();

  // Re-scan when new content is injected (SPA navigation)
  const observer = new MutationObserver(() => scan());
  observer.observe(document.body, { childList: true, subtree: true });

  // Periodic fallback scan every 15 seconds
  setInterval(scan, 15_000);
})();
