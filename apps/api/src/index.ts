import cors from 'cors';
import express from 'express';
import multer from 'multer';

import { scoreResume, type EngineResult, type ScoreInput } from '@ats/core';
import { extractDocx, extractWithPdfjs, extractWithPoppler } from './extractors.js';
import { fetchJobPosting } from './jobUrl.js';

const PORT = Number(process.env.PORT ?? 8787);
const MAX_BYTES = 8 * 1024 * 1024;
/** A CV is never this long. Anything past it is a mistake or an attempt to tie up CPU. */
const MAX_TEXT_CHARS = 400_000;

const app = express();

/**
 * This API is meant to run on your own machine beside the web app. It takes file
 * uploads and returns their contents, so opening it to every origin on the internet
 * would let any website in your browser read files you upload here. Localhost is the
 * default; set ALLOWED_ORIGIN to the exact origin if you host it somewhere.
 */
const allowed = process.env.ALLOWED_ORIGIN?.split(',').map((s) => s.trim()).filter(Boolean);
app.use(
  cors({
    origin(origin, cb) {
      // No Origin header: curl, a health check, a same-origin request.
      if (!origin) return cb(null, true);
      if (allowed?.length) return cb(null, allowed.includes(origin));
      return cb(null, /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(origin));
    },
  }),
);
app.use(express.json({ limit: '2mb' }));

/**
 * A small fixed-window limiter, kept dependency-free. Enough to stop one client pinning
 * the CPU with repeated large uploads; it is not a defence against a real botnet, and
 * anything internet-facing should sit behind a proper proxy.
 */
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 60;
const hits = new Map<string, { count: number; resetAt: number }>();

app.use('/api', (req, res, next) => {
  const key = req.ip ?? 'unknown';
  const now = Date.now();
  const seen = hits.get(key);
  if (!seen || now > seen.resetAt) hits.set(key, { count: 1, resetAt: now + WINDOW_MS });
  else if (++seen.count > MAX_REQUESTS) {
    res.status(429).json({ error: 'Too many requests. Wait a minute and try again.' });
    return;
  }
  // Keep the map from growing without bound on a long-running process.
  if (hits.size > 5000) for (const [k, v] of hits) if (now > v.resetAt) hits.delete(k);
  next();
});

// Files are held in memory and dropped when the response is sent. Nothing is written
// to disk except the temporary copy Poppler needs, which is removed in a finally block.
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_BYTES } });

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'ats-cv-scoring', version: 1 });
});

export interface ExtractResponse {
  filename: string;
  /** The text for the scorer. It comes from the reader that got the most characters. */
  text: string;
  primaryEngine: string;
  engines: EngineResult[];
  /**
   * True when the engines disagree about whether the file contains text at all.
   * That disagreement is the finding: some ATS parsers will read this file and
   * some will read nothing.
   */
  enginesDisagree: boolean;
}

/**
 * Only readers that actually ran can disagree.
 *
 * The old code counted each entry. Thus a reader that is not installed, because Poppler
 * is optional, looked the same as a reader that read the file and found nothing. On a
 * machine without Poppler, each file gave the message "the two readers do not agree".
 * This is the most serious result of this tool, and the files had no fault.
 */
export function readersDisagree(engines: EngineResult[]): boolean {
  const ran = engines.filter((e) => e.ok);
  const withText = ran.filter((e) => e.diagnostics.characters >= 120).length;
  return ran.length > 1 && withText > 0 && withText < ran.length;
}

app.post('/api/extract', upload.single('file'), async (req, res) => {
  const file = req.file;
  if (!file) {
    res.status(400).json({ error: 'No file uploaded. Send multipart/form-data with a "file" field.' });
    return;
  }

  const name = file.originalname.toLowerCase();
  let engines: EngineResult[];

  if (name.endsWith('.pdf')) {
    engines = await Promise.all([extractWithPdfjs(file.buffer), extractWithPoppler(file.buffer)]);
  } else if (name.endsWith('.docx')) {
    engines = [await extractDocx(file.buffer)];
  } else if (/\.(txt|md)$/.test(name)) {
    const text = file.buffer.toString('utf8');
    engines = [
      {
        engine: 'Plain text',
        ok: true,
        text,
        diagnostics: {
          engine: 'Plain text',
          pages: 1,
          textRuns: text.split('\n').filter((l) => l.trim()).length,
          drawingOps: 0,
          characters: text.replace(/\s/g, '').length,
        },
      },
    ];
  } else {
    res.status(415).json({ error: 'Unsupported file type. Send .pdf, .docx, .txt, or .md.' });
    return;
  }

  const usable = engines.filter((e) => e.ok);
  const best = usable.sort((a, b) => b.diagnostics.characters - a.diagnostics.characters)[0];

  const enginesDisagree = readersDisagree(engines);

  const body: ExtractResponse = {
    filename: file.originalname,
    text: best?.text ?? '',
    primaryEngine: best?.engine ?? 'none',
    engines,
    enginesDisagree,
  };
  res.json(body);
});

/**
 * Read a job advert from a link. Kept on the server because a browser cannot fetch
 * data from a different site, because job boards do not permit it. This route uses the
 * same request limit as the other routes. See jobUrl.ts for the purpose of each guard.
 */
app.post('/api/job', async (req, res) => {
  const url = (req.body as { url?: unknown } | undefined)?.url;
  if (typeof url !== 'string' || !url.trim() || url.length > 2000) {
    res.status(400).json({ error: 'Send a "url" string.' });
    return;
  }
  try {
    res.json(await fetchJobPosting(url));
  } catch (err) {
    // These messages are written for the person who pasted the link, so they are safe
    // to show. Anything unexpected is logged and reported blandly.
    const message = err instanceof Error ? err.message : '';
    if (message && message.length < 200) {
      res.status(422).json({ error: message });
      return;
    }
    console.error('[api] job fetch failed:', err);
    res.status(422).json({ error: 'That link could not be read.' });
  }
});

const isDiagnostics = (d: unknown): boolean =>
  !!d && typeof d === 'object' && typeof (d as { engine?: unknown }).engine === 'string';

/**
 * The score is a pure function, thus the API can give it. This is useful for CI and for
 * scripts.
 *
 * Every field is checked rather than trusted. Passing `mutedKeywords: "x"` used to
 * reach `.map` on a string and return a 500 carrying the internal error message, which
 * is both a crash and a small information leak.
 */
app.post('/api/score', (req, res) => {
  const body = (req.body ?? {}) as Record<string, unknown>;

  if (typeof body.text !== 'string') {
    res.status(400).json({ error: 'Body must include a "text" string.' });
    return;
  }
  if (body.text.length > MAX_TEXT_CHARS) {
    res.status(413).json({ error: `"text" is longer than ${MAX_TEXT_CHARS} characters.` });
    return;
  }
  if (body.jobDescription !== undefined && typeof body.jobDescription !== 'string') {
    res.status(400).json({ error: '"jobDescription" must be a string.' });
    return;
  }
  if (
    body.mutedKeywords !== undefined &&
    (!Array.isArray(body.mutedKeywords) || body.mutedKeywords.some((k) => typeof k !== 'string'))
  ) {
    res.status(400).json({ error: '"mutedKeywords" must be an array of strings.' });
    return;
  }
  if (body.engines !== undefined && (!Array.isArray(body.engines) || !body.engines.every(isDiagnostics))) {
    res.status(400).json({ error: '"engines" must be an array of diagnostics objects.' });
    return;
  }
  if (body.diagnostics !== undefined && !isDiagnostics(body.diagnostics)) {
    res.status(400).json({ error: '"diagnostics" must be a diagnostics object.' });
    return;
  }

  const input: ScoreInput = {
    text: body.text,
    jobDescription: typeof body.jobDescription === 'string' ? body.jobDescription : undefined,
    mutedKeywords: body.mutedKeywords as string[] | undefined,
    diagnostics: body.diagnostics as ScoreInput['diagnostics'],
    engines: body.engines as ScoreInput['engines'],
  };
  res.json(scoreResume(input));
});

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const message = err instanceof Error ? err.message : '';
  if (/File too large/i.test(message)) {
    res.status(413).json({ error: `File is larger than ${MAX_BYTES / 1024 / 1024} MB.` });
    return;
  }
  // Log the detail for whoever runs the server; return none of it to the caller.
  console.error('[api] unhandled error:', message || err);
  res.status(500).json({ error: 'Something went wrong reading that file.' });
});

/*
 * Bind to the loopback interface only.
 *
 * `app.listen(PORT)` on its own listens on 0.0.0.0, which puts this on every network the
 * machine is attached to. On shared Wi-Fi that hands anyone nearby an endpoint that
 * reads uploaded files and, through /api/job, fetches arbitrary URLs on their behalf.
 * CORS does not help: it restrains browsers, not anything making requests directly.
 *
 * Set HOST explicitly if you really are hosting this for others, and put it behind a
 * proxy that terminates TLS and authenticates.
 */
const HOST = process.env.HOST ?? '127.0.0.1';

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, HOST, () => {
    console.log(`ats-cv-scoring api listening on http://${HOST}:${PORT}`);
    if (HOST !== '127.0.0.1' && HOST !== 'localhost') {
      console.warn(`[api] reachable beyond this machine on ${HOST}. Put it behind a proxy.`);
    }
  });
}

export { app };
