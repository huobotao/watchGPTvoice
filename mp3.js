(() => {
  const MPEG_VERSION = { 0: 2.5, 1: null, 2: 2, 3: 1 };
  const LAYER = { 0: null, 1: 3, 2: 2, 3: 1 };

  const BITRATE_TABLE = {
    '1,1':  [0, 32, 64, 96,128,160,192,224,256,288,320,352,384,416,448],
    '1,2':  [0, 32, 48, 56, 64, 80, 96,112,128,160,192,224,256,320,384],
    '1,3':  [0, 32, 40, 48, 56, 64, 80, 96,112,128,160,192,224,256,320],
    '2,1':  [0, 32, 48, 56, 64, 80, 96,112,128,144,160,176,192,224,256],
    '2,2':  [0,  8, 16, 24, 32, 40, 48, 56, 64, 80, 96,112,128,144,160],
    '2,3':  [0,  8, 16, 24, 32, 40, 48, 56, 64, 80, 96,112,128,144,160],
  };
  BITRATE_TABLE['2.5,1'] = BITRATE_TABLE['2,1'];
  BITRATE_TABLE['2.5,2'] = BITRATE_TABLE['2,2'];
  BITRATE_TABLE['2.5,3'] = BITRATE_TABLE['2,3'];

  const SAMPLE_RATE = {
    1:   [44100, 48000, 32000],
    2:   [22050, 24000, 16000],
    2.5: [11025, 12000,  8000],
  };

  const SAMPLES_PER_FRAME = {
    '1,1': 384,
    '1,2': 1152,
    '1,3': 1152,
    '2,1': 384,
    '2,2': 1152,
    '2,3': 576,
    '2.5,1': 384,
    '2.5,2': 1152,
    '2.5,3': 576,
  };

  // Parse a 4-byte frame header. Returns null if invalid.
  function parseHeader(b0, b1, b2, b3) {
    if (b0 !== 0xFF || (b1 & 0xE0) !== 0xE0) return null;
    const version = MPEG_VERSION[(b1 >> 3) & 0x3];
    const layer = LAYER[(b1 >> 1) & 0x3];
    if (version === null || layer === null) return null;
    const bitrateIdx = (b2 >> 4) & 0xF;
    const sampleIdx = (b2 >> 2) & 0x3;
    const padding = (b2 >> 1) & 0x1;
    if (bitrateIdx === 0 || bitrateIdx === 0xF) return null;
    if (sampleIdx === 0x3) return null;
    const key = `${version},${layer}`;
    const bitrate = (BITRATE_TABLE[key] || [])[bitrateIdx];
    if (!bitrate) return null;
    const sampleRate = SAMPLE_RATE[version][sampleIdx];
    if (!sampleRate) return null;
    const samples = SAMPLES_PER_FRAME[key];
    let frameSize;
    if (layer === 1) {
      frameSize = Math.floor((12 * bitrate * 1000 / sampleRate + padding) * 4);
    } else {
      const coef = (version === 1) ? 144 : 72;
      frameSize = Math.floor(coef * bitrate * 1000 / sampleRate) + padding;
    }
    if (frameSize < 4) return null;
    const durationSec = samples / sampleRate;
    return { frameSize, durationSec, bitrate, sampleRate, version, layer };
  }

  // Returns the byte offset where MP3 audio data starts (skip ID3v2 if present).
  async function findAudioStart(file) {
    const head = new Uint8Array(await file.slice(0, 10).arrayBuffer());
    if (head.length >= 10 && head[0] === 0x49 && head[1] === 0x44 && head[2] === 0x33) {
      // ID3v2: bytes 6-9 are syncsafe size (each byte's MSB is 0)
      const size = (head[6] << 21) | (head[7] << 14) | (head[8] << 7) | head[9];
      return 10 + size;
    }
    return 0;
  }

  async function detectFormat(file) {
    const start = await findAudioStart(file);
    const buf = new Uint8Array(await file.slice(start, start + 4).arrayBuffer());
    if (buf.length < 4) throw new Error('File too small to be MP3');
    const header = parseHeader(buf[0], buf[1], buf[2], buf[3]);
    if (!header) {
      throw new Error('Not a valid MP3 file (no sync frame found). v1 only supports MP3 — convert m4a/wav first.');
    }
    return { audioStart: start, firstHeader: header };
  }

  // Async generator yielding { byteOffset, byteLength, durationSec } per MP3 frame.
  // Reads the file in 4 MB windows; maintains a small carry-over buffer for frames
  // that straddle a window boundary.
  async function* parseFrames(file, audioStart, onProgress) {
    const READ = 4 * 1024 * 1024;
    const fileSize = file.size;
    let cursor = audioStart;        // absolute byte position in file we're parsing from
    let buf = new Uint8Array(0);    // in-memory window starting at `bufStart`
    let bufStart = cursor;

    while (cursor < fileSize) {
      // Ensure we have enough bytes ahead of `cursor` to read at least one header
      const localOff = cursor - bufStart;
      if (buf.length - localOff < 4) {
        // Refill: drop everything before cursor, fetch next window
        const readFrom = cursor;
        const readTo = Math.min(fileSize, readFrom + READ);
        const next = new Uint8Array(await file.slice(readFrom, readTo).arrayBuffer());
        buf = next;
        bufStart = readFrom;
        if (buf.length < 4) break;
      }

      const off = cursor - bufStart;
      const b0 = buf[off], b1 = buf[off + 1], b2 = buf[off + 2], b3 = buf[off + 3];
      const h = parseHeader(b0, b1, b2, b3);

      if (!h) {
        // Lost sync. Search forward for next 0xFF within current window.
        let next = -1;
        for (let i = off + 1; i < buf.length - 1; i++) {
          if (buf[i] === 0xFF && (buf[i + 1] & 0xE0) === 0xE0) { next = i; break; }
        }
        if (next === -1) {
          // No sync in this window; jump forward, force a refill
          cursor = bufStart + buf.length - 3; // keep last 3 bytes in case of straddle
          if (cursor >= fileSize) break;
          // Force refill on next iteration
          buf = new Uint8Array(0);
          continue;
        }
        cursor = bufStart + next;
        continue;
      }

      // We need the whole frame in `buf` to advance cleanly (don't strictly need
      // to read it, but ensure we won't trip frameSize past buffer end).
      if (off + h.frameSize > buf.length && (bufStart + buf.length) < fileSize) {
        // Frame straddles window — refill starting at cursor
        const readFrom = cursor;
        const readTo = Math.min(fileSize, readFrom + READ);
        buf = new Uint8Array(await file.slice(readFrom, readTo).arrayBuffer());
        bufStart = readFrom;
        if (buf.length < h.frameSize) {
          // File truncated mid-frame; stop
          break;
        }
      }

      yield { byteOffset: cursor, byteLength: h.frameSize, durationSec: h.durationSec };
      cursor += h.frameSize;

      if (onProgress) onProgress(cursor, fileSize);
    }
  }

  // Consume parseFrames; group frames into chunks of ~targetSec seconds (or until
  // accumulated bytes ≈ maxBytes). Yields { index, startSec, endSec, byteStart,
  // byteEnd, durationSec, blob }.
  async function* chunkFile(file, opts = {}) {
    const targetSec = opts.targetSec || 600;       // 10 min
    const maxBytes = opts.maxBytes || 22 * 1024 * 1024;
    const onProgress = opts.onProgress;
    const { audioStart } = await detectFormat(file);

    let chunkIndex = 0;
    let chunkStartByte = audioStart;
    let chunkStartSec = 0;
    let accSec = 0;
    let lastByte = audioStart;

    for await (const f of parseFrames(file, audioStart, onProgress)) {
      const frameEnd = f.byteOffset + f.byteLength;
      const wouldDur = accSec + f.durationSec;
      const wouldBytes = frameEnd - chunkStartByte;

      if (accSec > 0 && (wouldDur > targetSec || wouldBytes > maxBytes)) {
        // Emit current chunk (frames up to but not including this one)
        const blob = file.slice(chunkStartByte, lastByte, 'audio/mpeg');
        yield {
          index: chunkIndex++,
          startSec: chunkStartSec,
          endSec: chunkStartSec + accSec,
          byteStart: chunkStartByte,
          byteEnd: lastByte,
          durationSec: accSec,
          blob,
        };
        chunkStartByte = f.byteOffset;
        chunkStartSec += accSec;
        accSec = 0;
      }

      accSec += f.durationSec;
      lastByte = frameEnd;
    }

    // Tail
    if (accSec > 0) {
      const blob = file.slice(chunkStartByte, lastByte, 'audio/mpeg');
      yield {
        index: chunkIndex,
        startSec: chunkStartSec,
        endSec: chunkStartSec + accSec,
        byteStart: chunkStartByte,
        byteEnd: lastByte,
        durationSec: accSec,
        blob,
      };
    }
  }

  // Compute total duration by streaming through every frame. Used for cost estimate.
  async function totalDuration(file, onProgress) {
    const { audioStart } = await detectFormat(file);
    let total = 0;
    for await (const f of parseFrames(file, audioStart, onProgress)) {
      total += f.durationSec;
    }
    return total;
  }

  // Merkle-style hash: hash each 4 MB slice, then hash the concat of digests.
  // Not a real SHA-256 of the file — only used as a cache key.
  async function sha256OfFile(file, onProgress) {
    const SLICE = 4 * 1024 * 1024;
    const digests = [];
    for (let off = 0; off < file.size; off += SLICE) {
      const end = Math.min(file.size, off + SLICE);
      const buf = await file.slice(off, end).arrayBuffer();
      const d = await crypto.subtle.digest('SHA-256', buf);
      digests.push(new Uint8Array(d));
      if (onProgress) onProgress(end, file.size);
    }
    const total = digests.reduce((s, d) => s + d.length, 0);
    const concat = new Uint8Array(total);
    let p = 0;
    for (const d of digests) { concat.set(d, p); p += d.length; }
    const final = await crypto.subtle.digest('SHA-256', concat);
    return Array.from(new Uint8Array(final)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  window.TLMP3 = { detectFormat, parseFrames, chunkFile, totalDuration, sha256OfFile };
})();
