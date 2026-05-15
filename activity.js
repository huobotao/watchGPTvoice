(() => {
  const ENDPOINT = 'https://api.openai.com/v1/chat/completions';
  const MODEL = 'gpt-4o-mini';
  const SUGGESTED_LABELS = [
    'sleep', 'cooking', 'meeting', 'one-on-one', 'silence',
    'commuting', 'entertainment', 'work', 'phone-call', 'uncertain',
  ];

  function sleep(ms, signal) {
    return new Promise((resolve, reject) => {
      const t = setTimeout(resolve, ms);
      if (signal) {
        signal.addEventListener('abort', () => {
          clearTimeout(t);
          reject(new DOMException('Aborted', 'AbortError'));
        }, { once: true });
      }
    });
  }

  function windowize(words, windowSec = 300) {
    if (!words.length) return [];
    const totalEnd = words[words.length - 1].end;
    const windows = [];
    let i = 0;
    for (let start = 0; start < totalEnd; start += windowSec) {
      const end = start + windowSec;
      const wordsInWindow = [];
      while (i < words.length && words[i].start < end) {
        wordsInWindow.push(words[i]);
        i++;
      }
      const text = wordsInWindow.map(w => w.word).join('').trim();
      windows.push({
        index: windows.length,
        startSec: start,
        endSec: Math.min(end, totalEnd),
        text,
        wordCount: wordsInWindow.length,
      });
    }
    return windows;
  }

  function prefilterSilence(windows) {
    for (const w of windows) {
      const windowMin = (w.endSec - w.startSec) / 60;
      const wpm = windowMin > 0 ? w.wordCount / windowMin : 0;
      if (wpm < 5) {
        w.label = 'silence';
        w.confidence = 0.95;
        w.prefiltered = true;
      }
    }
    return windows;
  }

  function buildSystemPrompt() {
    return `You classify what activity a person is doing during each transcribed audio window. Each window is 5 minutes of speech from a personal voice recorder.

Return JSON. Schema: { "results": [ { "window_index": number, "label": string, "confidence": number } ] }

Label vocabulary (prefer these; you may invent a new short kebab-case label if none fit):
${SUGGESTED_LABELS.map(l => `  - ${l}`).join('\n')}

Use "uncertain" when the speech is too sparse or ambiguous to decide. "silence" was already auto-assigned to near-silent windows — never re-label them. Confidence is 0.0–1.0.

Examples of cues:
- "cooking" — sounds of utensils mentioned, recipe steps, smell/taste talk
- "meeting" — multiple speakers, agenda/action-item language, professional vocab
- "one-on-one" — two voices, casual personal/relational topics
- "commuting" — traffic, vehicle, transit references, navigation
- "phone-call" — short responses, "uh-huh", "okay", greeting/sign-off patterns
- "sleep" — almost no words, sleep-talk, white noise mentioned`;
  }

  async function classifyBatch(batch, apiKey, signal) {
    const userPayload = batch.map(w => ({ i: w.index, text: w.text.slice(0, 2000) }));
    const body = {
      model: MODEL,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: buildSystemPrompt() },
        { role: 'user', content: JSON.stringify({ windows: userPayload }) },
      ],
    };

    const backoffs = [2000, 4000, 8000, 16000, 30000];
    let lastErr = null;
    for (let attempt = 0; attempt <= backoffs.length; attempt++) {
      try {
        const res = await fetch(ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify(body),
          signal,
        });
        if (res.ok) {
          const json = await res.json();
          const content = json.choices?.[0]?.message?.content || '{}';
          let parsed;
          try { parsed = JSON.parse(content); }
          catch (e) {
            if (attempt < backoffs.length) {
              await sleep(backoffs[attempt], signal);
              continue;
            }
            throw new Error('GPT returned non-JSON');
          }
          const results = parsed.results || [];
          return { results, usage: json.usage || null };
        }
        if (res.status === 401 || res.status === 403) {
          throw new Error('OpenAI auth failed (401/403). Check your API key.');
        }
        if (res.status === 429 || res.status >= 500) {
          lastErr = new Error(`GPT ${res.status}`);
          lastErr.status = res.status;
          if (attempt < backoffs.length) {
            await sleep(backoffs[attempt] + Math.random() * 500, signal);
            continue;
          }
          throw lastErr;
        }
        throw new Error(`GPT ${res.status}: ${await res.text().catch(() => '')}`);
      } catch (e) {
        if (e.name === 'AbortError') throw e;
        if (attempt < backoffs.length && (e.message?.includes('NetworkError') || e.message?.includes('Failed to fetch'))) {
          await sleep(backoffs[attempt], signal);
          continue;
        }
        throw e;
      }
    }
    throw lastErr || new Error('GPT: exhausted retries');
  }

  async function classifyAll(windows, apiKey, opts = {}) {
    const batchSize = opts.batchSize || 10;
    const concurrency = opts.concurrency || 2;
    const onProgress = opts.onProgress || (() => {});
    const signal = opts.signal;

    // Build batches from non-prefiltered windows
    const todo = windows.filter(w => !w.prefiltered);
    const batches = [];
    for (let i = 0; i < todo.length; i += batchSize) {
      batches.push(todo.slice(i, i + batchSize));
    }

    let done = 0;
    let totalTokens = 0;
    let nextBatch = 0;

    async function worker() {
      while (true) {
        if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
        const my = nextBatch++;
        if (my >= batches.length) return;
        const batch = batches[my];
        try {
          const { results, usage } = await classifyBatch(batch, apiKey, signal);
          if (usage?.total_tokens) totalTokens += usage.total_tokens;
          for (const r of results) {
            const w = windows.find(x => x.index === r.window_index);
            if (w && !w.prefiltered) {
              w.label = r.label || 'uncertain';
              w.confidence = typeof r.confidence === 'number' ? r.confidence : 0.5;
            }
          }
          // Mark windows in this batch that didn't get a label
          for (const w of batch) {
            if (!w.label) { w.label = 'uncertain'; w.confidence = 0.3; }
          }
        } catch (e) {
          if (e.name === 'AbortError') throw e;
          for (const w of batch) {
            w.label = 'uncertain';
            w.confidence = 0.2;
            w.error = String(e.message || e);
          }
        }
        done++;
        onProgress(done, batches.length);
      }
    }

    const workers = Array.from({ length: Math.min(concurrency, batches.length || 1) }, () => worker());
    await Promise.all(workers);

    return { windows, totalTokens, batchCount: batches.length };
  }

  // Merge consecutive same-label windows into segments.
  function mergeAdjacent(windows) {
    if (!windows.length) return [];
    const segments = [];
    let cur = {
      startSec: windows[0].startSec,
      endSec: windows[0].endSec,
      label: windows[0].label || 'uncertain',
      confidence: windows[0].confidence || 0.3,
      text: windows[0].text,
      _count: 1,
    };
    for (let i = 1; i < windows.length; i++) {
      const w = windows[i];
      const label = w.label || 'uncertain';
      if (label === cur.label) {
        cur.endSec = w.endSec;
        cur.text += (cur.text ? ' ' : '') + w.text;
        cur.confidence = (cur.confidence * cur._count + (w.confidence || 0.3)) / (cur._count + 1);
        cur._count++;
      } else {
        delete cur._count;
        segments.push(cur);
        cur = {
          startSec: w.startSec,
          endSec: w.endSec,
          label,
          confidence: w.confidence || 0.3,
          text: w.text,
          _count: 1,
        };
      }
    }
    delete cur._count;
    segments.push(cur);
    return segments;
  }

  window.TLActivity = { windowize, prefilterSilence, classifyAll, mergeAdjacent, SUGGESTED_LABELS };
})();
