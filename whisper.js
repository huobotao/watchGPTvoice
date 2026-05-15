(() => {
  const ENDPOINT = 'https://api.openai.com/v1/audio/transcriptions';
  const MODEL = 'whisper-1';

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

  async function transcribeChunk(blob, apiKey, signal) {
    const form = new FormData();
    form.append('file', blob, 'chunk.mp3');
    form.append('model', MODEL);
    form.append('response_format', 'verbose_json');
    form.append('timestamp_granularities[]', 'word');
    form.append('language', 'zh');

    const backoffs = [2000, 4000, 8000, 16000, 30000];
    let lastErr = null;
    for (let attempt = 0; attempt <= backoffs.length; attempt++) {
      try {
        const res = await fetch(ENDPOINT, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${apiKey}` },
          body: form,
          signal,
        });
        if (res.ok) {
          const json = await res.json();
          // verbose_json with word granularity → json.words: [{word, start, end}, ...]
          return {
            words: json.words || [],
            duration: json.duration || 0,
            text: json.text || '',
          };
        }
        if (res.status === 401 || res.status === 403) {
          throw new Error('OpenAI auth failed (401/403). Check your API key.');
        }
        if (res.status === 429 || res.status >= 500) {
          lastErr = new Error(`Whisper ${res.status}: ${await res.text().catch(() => '')}`);
          lastErr.status = res.status;
          if (attempt < backoffs.length) {
            await sleep(backoffs[attempt] + Math.random() * 500, signal);
            continue;
          }
          throw lastErr;
        }
        // Other 4xx — don't retry
        const body = await res.text().catch(() => '');
        throw new Error(`Whisper ${res.status}: ${body}`);
      } catch (e) {
        if (e.name === 'AbortError') throw e;
        if (attempt < backoffs.length && (e.message?.includes('NetworkError') || e.message?.includes('Failed to fetch'))) {
          await sleep(backoffs[attempt] + Math.random() * 500, signal);
          continue;
        }
        throw e;
      }
    }
    throw lastErr || new Error('Whisper: exhausted retries');
  }

  // Worker-pool over async iterator of chunks. Stitches global timestamps.
  // chunks: array of { index, startSec, endSec, durationSec, blob }
  async function transcribeAll(chunks, apiKey, opts = {}) {
    const concurrency = opts.concurrency || 3;
    const onChunkDone = opts.onChunkDone || (() => {});
    const onError = opts.onError || (() => {});
    const signal = opts.signal;

    const results = new Array(chunks.length);
    let nextIdx = 0;
    let activeConcurrency = concurrency;
    let consecutive429 = 0;

    async function worker() {
      while (true) {
        if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
        const myIdx = nextIdx++;
        if (myIdx >= chunks.length) return;
        const chunk = chunks[myIdx];
        try {
          const r = await transcribeChunk(chunk.blob, apiKey, signal);
          consecutive429 = 0;
          const offset = chunk.startSec;
          const shifted = r.words.map(w => ({
            word: w.word,
            start: (w.start || 0) + offset,
            end: (w.end || 0) + offset,
          }));
          results[myIdx] = { words: shifted, text: r.text, ok: true, chunk };
          onChunkDone(myIdx, chunks.length);
        } catch (e) {
          if (e.name === 'AbortError') throw e;
          if (e.status === 429) {
            consecutive429++;
            if (consecutive429 >= 2 && activeConcurrency > 1) {
              activeConcurrency = 1;
            }
          }
          results[myIdx] = { words: [], text: '', ok: false, chunk, error: String(e.message || e) };
          onError(myIdx, e);
          onChunkDone(myIdx, chunks.length);
        }
      }
    }

    const workers = Array.from({ length: concurrency }, () => worker());
    await Promise.all(workers);

    // Stitch into a single sorted word array (chunks are already non-overlapping).
    const words = [];
    for (const r of results) {
      if (r && r.ok) words.push(...r.words);
    }
    words.sort((a, b) => a.start - b.start);

    const totalDuration = chunks.length ? chunks[chunks.length - 1].endSec : 0;
    const failedChunks = results
      .map((r, i) => r && !r.ok ? { index: i, chunk: r.chunk, error: r.error } : null)
      .filter(Boolean);

    return { words, duration: totalDuration, failedChunks };
  }

  window.TLWhisper = { transcribeChunk, transcribeAll };
})();
