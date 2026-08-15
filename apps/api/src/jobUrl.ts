import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

/**
 * Fetches a job advert from a link the user pasted.
 *
 * This is the one place the server reaches out to the internet on a user's say-so, which
 * makes it the obvious hole in an otherwise offline tool. Server-side fetchers get used
 * to get data that the caller cannot get: cloud metadata addresses, admin pages on the
 * loopback interface and machines on the same network. Each guard below has this
 * purpose. The function permits only http and https. It examines each address after DNS
 * resolution. It refuses private and reserved addresses. It has a timeout and a limit on
 * the quantity of data.
 */

const MAX_BYTES = 2 * 1024 * 1024;
const TIMEOUT_MS = 12_000;
const MAX_REDIRECTS = 3;

/** Private, loopback, link-local, carrier-grade NAT and other non-public ranges. */
export function isPrivateAddress(ip: string): boolean {
  const v = isIP(ip);
  if (v === 4) {
    const p = ip.split('.').map(Number);
    if (p.length !== 4 || p.some((n) => Number.isNaN(n))) return true;
    const [a, b] = p;
    if (a === 10 || a === 127 || a === 0) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 169 && b === 254) return true; // link-local, incl. cloud metadata
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
    if (a >= 224) return true; // multicast and reserved
    return false;
  }
  if (v === 6) {
    const s = ip.toLowerCase().replace(/^\[|\]$/g, '');
    if (s === '::' || s === '::1') return true;
    if (s.startsWith('fe80') || s.startsWith('fc') || s.startsWith('fd')) return true;
    // IPv4-mapped: ::ffff:169.254.169.254 and friends.
    const mapped = s.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPrivateAddress(mapped[1]);
    return false;
  }
  return true;
}

async function assertPublicHost(hostname: string): Promise<void> {
  const bare = hostname.replace(/^\[|\]$/g, '');
  if (isIP(bare)) {
    if (isPrivateAddress(bare)) throw new Error('That address is not reachable from here.');
    return;
  }
  let records: { address: string }[];
  try {
    records = await lookup(bare, { all: true });
  } catch {
    throw new Error('That address could not be found.');
  }
  // Every result must be public: one private answer is enough to be a rebind attempt.
  if (!records.length || records.some((r) => isPrivateAddress(r.address))) {
    throw new Error('That address is not reachable from here.');
  }
}

/** LinkedIn's job pages sit behind a login wall; this public endpoint does not. */
function linkedInGuestUrl(url: URL): string | null {
  if (!/(^|\.)linkedin\.com$/i.test(url.hostname)) return null;
  const id = url.pathname.match(/(?:jobs\/view\/)(?:[^/]*?-)?(\d{6,})/)?.[1] ?? url.searchParams.get('currentJobId');
  return id ? `https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/${id}` : null;
}

async function readCapped(res: Response): Promise<string> {
  const reader = res.body?.getReader();
  if (!reader) return '';
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > MAX_BYTES) {
      await reader.cancel();
      break;
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString('utf8');
}

/** Follows redirects by hand so each hop can be re-checked before it is followed. */
async function safeFetch(startUrl: string): Promise<{ html: string; finalUrl: string }> {
  let current = startUrl;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const url = new URL(current);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      throw new Error('Only http and https links can be read.');
    }
    await assertPublicHost(url.hostname);

    const res = await fetch(url, {
      redirect: 'manual',
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: {
        // Identify honestly, and ask for the page a reader would get.
        'user-agent': 'Mozilla/5.0 (compatible; ATS; +https://github.com/itsbyferdi/ATS)',
        accept: 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8',
        'accept-language': 'en',
      },
    });

    if (res.status >= 300 && res.status < 400) {
      const next = res.headers.get('location');
      if (!next) throw new Error('That link redirected somewhere it did not say.');
      current = new URL(next, url).toString();
      continue;
    }
    if (!res.ok) throw new Error(`That page returned ${res.status}.`);
    return { html: await readCapped(res), finalUrl: url.toString() };
  }
  throw new Error('That link redirected too many times.');
}

const decode = (s: string) =>
  s
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#0?39;|&apos;|&rsquo;/g, "'")
    .replace(/&quot;|&ldquo;|&rdquo;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));

function htmlToText(html: string): string {
  let s = html.replace(/<(script|style|noscript|svg|nav|footer|header|form)[^>]*>[\s\S]*?<\/\1>/gi, ' ');
  s = s.replace(/<li[^>]*>/gi, '\n- ');
  s = s.replace(/<\/(p|div|h[1-6]|li|tr|section|article)>/gi, '\n');
  s = s.replace(/<br\s*\/?>/gi, '\n');
  s = s.replace(/<[^>]+>/g, ' ');
  return decode(s)
    .replace(/[ \t ]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Some boards publish the advert as schema.org JobPosting, which beats scraping. */
function fromJsonLd(html: string): { title?: string; text: string } | null {
  const blocks = html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi);
  for (const b of blocks) {
    let data: unknown;
    try {
      data = JSON.parse(b[1].trim());
    } catch {
      continue;
    }
    const nodes = Array.isArray(data) ? data : [data];
    for (const node of nodes) {
      const n = node as Record<string, unknown>;
      if (n?.['@type'] !== 'JobPosting') continue;
      const description = typeof n.description === 'string' ? htmlToText(n.description) : '';
      if (description.split(/\s+/).length < 40) continue;
      const title = typeof n.title === 'string' ? n.title : undefined;
      return { title, text: title ? `${title}\n\n${description}` : description };
    }
  }
  return null;
}

export interface JobFetchResult {
  text: string;
  source: string;
  /** True when the advert came from structured data rather than scraped markup. */
  structured: boolean;
}

export async function fetchJobPosting(rawUrl: string): Promise<JobFetchResult> {
  let url: URL;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    throw new Error('That does not look like a web address.');
  }

  const target = linkedInGuestUrl(url) ?? url.toString();
  const { html, finalUrl } = await safeFetch(target);

  const structured = fromJsonLd(html);
  if (structured) return { text: structured.text, source: finalUrl, structured: true };

  const text = htmlToText(html);
  if (text.split(/\s+/).length < 60) {
    throw new Error(
      'That page did not give sufficient text. The site can require you to sign in. Copy the advert and put it in the box below.',
    );
  }
  return { text, source: finalUrl, structured: false };
}
