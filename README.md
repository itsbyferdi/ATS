# ATS CV Scoring

**Check whether hiring software can actually read your CV — and rebuild it so it can.**

Most companies put your CV through software before a person sees it. That software has
to pull your name, email, job titles and dates out of the file. When it cannot, your
details land in the wrong place, or nowhere. You never find out why.

This tool shows you exactly what that software sees, scores your CV against an open
checklist where every point is explained, and can rewrite it into a clean version you
can download.

![The scanner scoring a CV](docs/screenshot.png)

---

## Your CV stays on your computer

This matters, so it comes first.

**Your CV never leaves your computer.** There is no account, no sign-up, no tracking, no
analytics, and nothing is stored anywhere.

Precisely what happens, because "it's private" is easy to say and worth being exact
about:

- **On its own, the tool reads your CV inside your browser.** Nothing is sent anywhere at
  all — you can disconnect from the internet and it still works.
- **If you start the optional second reader**, your CV is sent to that reader — which is
  a small program running on *your own machine*, listening on `127.0.0.1` and refusing
  connections from anywhere else. It holds the file in memory and drops it the moment it
  answers. It is a local trip, not an upload, but it is a trip, so it is named here.
- **The only thing that ever goes to the internet** is a job advert link, and only when
  you paste one and press the button. Your CV is not part of that request.

This is checked rather than claimed. `scripts/check-privacy.mjs` drives the whole tool in
a real browser with a marker string planted inside the CV, records every network request
the page makes, and fails if any of them leaves this machine or carries the marker. Run it
yourself:

```bash
npx playwright install chromium   # one-off
npm run dev                       # in another terminal
npm run check:privacy
```

---

## What you need first

One thing: a free program called **Node.js**. It lets your computer run this kind of
project. You do not need to know anything about it beyond installing it.

1. Go to **[nodejs.org](https://nodejs.org)**
2. Download the version labelled **LTS** (it means "long term support" — the stable one)
3. Open the downloaded file and click through the installer, accepting the defaults

That is the only thing you need to install.

---

## Getting it running

You will use an app called the **Terminal**. It is a window where you type commands
instead of clicking buttons. It comes free with your computer.

**To open it:**

- **Mac** — press `Cmd` + `Space`, type `Terminal`, press Enter
- **Windows** — press the Start button, type `PowerShell`, press Enter
- **Linux** — press `Ctrl` + `Alt` + `T`

Now follow these four steps. **Type each line, then press Enter**, and wait for it to
finish before doing the next one.

### Step 1 — Download this project

```bash
git clone https://github.com/itsbyferdi/ats-cv-scoring.git
```

If that gives an error saying `git` was not found, you can instead download it as a
folder: click the green **Code** button at the top of this page on GitHub, choose
**Download ZIP**, and unzip it.

### Step 2 — Go into the project folder

```bash
cd ats-cv-scoring
```

`cd` means "change directory". You are telling the terminal which folder to work in.

### Step 3 — Install the parts it needs

```bash
npm install
```

This downloads the building blocks the project uses. It takes a minute or two and prints
a lot of text. That is normal. Some warnings are normal too.

### Step 4 — Start it

```bash
npm run dev
```

You will see something like:

```
➜  Local:   http://localhost:5173/
```

**Open that address in your web browser.** The tool is now running.

> **Leave the terminal window open** while you use it. Closing it stops the tool. To stop
> it deliberately, click the terminal and press `Ctrl` + `C`.
>
> **Next time**, you only need steps 2 and 4 — the install is a one-off.

---

## Using it

The tool walks you through four steps, one screen at a time.

### 1. Your CV

Drag in the exact file you send to employers — `.pdf`, `.docx`, `.txt` or `.md` — or
paste the text in. Use the real file, not a tidied-up copy, because the file itself is
half of what is being tested.

### 2. The job

Paste in the job advert. This is optional. With it, you also get a score for how well
your wording matches the role. Without it, you still get a score for format and
structure, worked out of 75 instead of 100.

**You can paste a link instead of the text.** Give it the address of the advert and it
will read it for you. This needs the optional second part running (see
[Optional extras](#optional-extras-advanced)) because a web browser is not allowed to
fetch other websites directly. It works with most job boards. Some sites make you sign in
before they show the advert — if yours cannot be read, copy the text and paste it in.

**It works for any job.** The tool reads the advert, works out what field it is for, and
scores you against that field's vocabulary — nursing terms for a nursing post, accounting
terms for an accounting post. There are sample adverts from six different fields you can
try. A job in a field it has never seen still works, because repeated terms in the advert
are picked up regardless.

### 3. Results

Five things to look at, one at a time:

| Tab | What it tells you |
|---|---|
| **Score** | Your total, and how it breaks down |
| **Do these first** | The handful of fixes worth the most points |
| **Keywords** | Words the advert leans on that your CV never says |
| **What software sees** | The details a computer managed to pull out — check these are right |
| **All checks** | Every single test, with the reason for its score |

**"What software sees" is the most useful tab.** If your email or job dates are missing
there, they are missing for every employer too.

### 4. Rebuild

Rewrites your CV into a clean version and lets you download it. Pick one of three
layouts, see the score before and after, then download.

| Layout | What it does | Choose it when |
|---|---|---|
| **Classic** | Summary, experience, education, skills | You are not sure — this is the safe default |
| **Compact** | No summary, skills on one line | You have many jobs and want them on page one |
| **Skills first** | Skills above your job history | You are changing field, or the advert is tool-heavy |

**Which file should I send?** The **DOCX**. It is the format that survives this software
best. The PDF is fine too — it is printed by your own browser, so the text stays
readable. Markdown is for editing your own copy, not for sending.

---

## What the score actually means

Being straight with you: **this number is ours, not theirs.**

No real hiring system gives out a score from 100. Greenhouse sorts people into five
bands and states in its own documentation that it never rejects or advances anyone by
itself. Workday grades A to D. A recruiter still decides. The weightings that genuinely
rank you are set by whoever posted the job, on controls you will never see.

You may also have read that "75% of CVs are rejected automatically". There is no
research behind that figure — it traces back to a company that shut down in 2013.

So use this score to compare one draft of your CV against your next one, and nothing
more. What *does* hold true everywhere is much simpler:

> **A detail the software cannot pull out is a detail nobody can search for.**

That is what the Parse Safety and Contact checks protect, and it is the part worth
taking seriously.

One more honest note: the **Impact Language** section — action verbs, numbers in your
bullets — is not something any hiring software measures. It is there because a human
reads your CV after the search, and that is what they skim.

---

## Common problems

**"command not found: npm"**
Node.js is not installed, or the terminal was open before you installed it. Close the
terminal, open a new one, and try again.

**"Port 5173 is in use"**
It is already running in another window. Look for an address like `localhost:5174` in
the text — use that one instead.

**The page is blank, or nothing happens**
Make sure the terminal still shows the `Local:` address and has not been closed.

**My score is 0 and it says "No text at all"**
This is the tool working correctly, not a bug. Your PDF contains pictures of letters
rather than letters. This happens when a PDF is exported from a design tool like Figma,
Sketch or Canva. Rebuild the file in Word or Google Docs, or send the DOCX instead.

**You can test any file yourself:** open it, press `Ctrl`+`A` then `Ctrl`+`C`, and paste
into a plain notepad. If what lands is not clean readable text, no hiring software can
read it either.

**It says my CV "cannot be rebuilt safely"**
The tool could not read your file's structure well enough to rebuild it without losing
things, so it refuses rather than hand you a CV that quietly dropped a job. Fix the
original first — rebuild it in Word or Google Docs — then try again.

---

## Optional extras (advanced)

You can skip this. It adds two things: a second, independent way of reading PDFs — so the
tool can tell you when two readers disagree about your file, which is a strong warning
sign — and the ability to read a job advert from a link.

Open a **second** terminal window, go to the project folder, and run:

```bash
npm run dev:api
```

The web page picks it up automatically. For the second reader to work fully you also
need a free tool called `poppler`:

```bash
# Mac
brew install poppler

# Debian / Ubuntu Linux
sudo apt-get install poppler-utils
```

Without it, everything still works — the tool just reports that reader as unavailable.

---

## Is this safe to run?

Yes, and here is precisely why, in plain terms:

- **Nothing is uploaded.** Your CV is read inside your browser and stays there.
- **No accounts, no tracking, no analytics.** There is nothing to sign up for.
- **No secrets or keys** are stored anywhere in this project.
- **The optional server only listens to your own computer.** A website you visit cannot
  reach it. If you deploy it somewhere public, set `ALLOWED_ORIGIN` to your address.
- **Uploads are capped** at 8 MB and are held in memory, then dropped as soon as the
  answer is sent.
- **The example CV in this project is fictional.** No real person's details are included.

If you find a security problem, please open an issue on GitHub.

---

<details>
<summary><b>For developers</b> — architecture, tests, and the reasoning behind the rubric</summary>

## Layout

```
packages/core   @ats/core  — scoring engine and rebuilder. Pure, zero runtime deps.
apps/web        @ats/web   — React single page. Vite, TypeScript, plain CSS with design tokens.
apps/api        @ats/api   — Express. Optional. Adds the second PDF reader.
```

The engine is deliberately separate from both. Text goes in, a report comes out; it knows
nothing about files, HTTP, or React. That is what makes the rubric testable.

```bash
npm test         # vitest — 116 tests across the engine and the API
npm run typecheck
npm run build
```

Two fixtures drive the tests: text pulled from a two-column PDF, and the single-column
rebuild of the same career. The gap between them is what this project measures.

```
legacy-two-column.txt        45/100   needs work
optimised-single-column.txt  91/100   strong
```

## Scoring

Five groups, 100 points. Job Match drops out with no job description, and the total is
worked out of 75.

| Group | Points | Protects | Audience |
|---|---|---|---|
| Parse Safety | 25 | Broken words, reading order, length, unreadable fonts, contact placement | Machine |
| Contact | 15 | Email, phone, location, LinkedIn, portfolio as plain text | Machine |
| Structure | 20 | Section headings, readable dates, newest job first | Machine |
| Impact Language | 15 | Verb-first bullets, numbers, bullet length, filler | Human |
| Job Match | 25 | Keyword coverage, job title, terms in the current role | Both |

### Grounded in real standards

There is no official standard for a "CV score", which is why every online scanner gives
a different number. Two parts of this rubric are grounded in actual standards rather than
guesswork:

- **ISO 32000** (the PDF format). A Type 3 font may store each letter as a small drawing
  program, with nothing requiring it to record which character that drawing represents.
  The tool counts Type 3 fonts and names them as the cause only when it finds them.
- **ISO 14289 / PDF-UA.** A PDF states its reading order in a structure tree. Without
  one, every reader has to infer the order from where text sits on the page — which is
  how a sidebar ends up stitched into your job bullets. An untagged PDF never scores full
  marks for reading order.

### Any profession, not just the one it was written for

Field vocabulary lives in `domains.ts` as packs — software, design, data, product,
marketing, sales, finance, HR, operations, healthcare, education, legal, support,
writing, science, skilled trades — plus a `UNIVERSAL` set that applies to every posting.
A posting selects the packs whose cues it contains, so a nursing advert is ranked with
clinical vocabulary rather than design vocabulary. Adding a field means adding one entry;
nothing else changes. A field with no pack still works, because repeated unknown terms are
picked up statistically.

### No free points, and no unfair penalties

If a check cannot run — no job title detectable in the posting — it is removed from the
total rather than quietly awarded half marks. The same goes the other way: the "link to
your work" check only counts in fields that expect one, because an accountant without a
portfolio is not doing anything wrong.

## Rebuilding

`parseCv` turns flat text back into structure; three templates render it to text,
Markdown and HTML. Exports are real OOXML (via `docx`) for Word, and the browser's own
print pipeline for PDF, so both carry genuine text layers.

**It checks its own work.** The parser is heuristic, and on a CV whose text layer is
already broken it fails badly. `rebuildCv` compares words in against words retained and
refuses if more than a tenth went missing or no job history parsed — handing someone a
"cleaned up" CV that silently lost two jobs would do real damage. Nothing is dropped
either way: unplaceable blocks are written out under "Additional information".

## API

```
GET  /api/health
POST /api/extract   multipart/form-data, field "file"  →  text + per-reader diagnostics
POST /api/score     { text, jobDescription?, mutedKeywords?, diagnostics?, engines? }
POST /api/job       { url }  →  { text, source, structured }
```

Pass `engines` — every reader that ran, not just the winning one. `/api/extract` returns
whichever reader recovered the most text, so scoring only that one hides the case where
another read nothing, which is the entire point of running two.

`/api/job` reads a job advert from a link. It is the only outbound request this project
makes, which makes it the obvious SSRF target, so: http and https only, DNS resolved and
every address checked against the private, loopback, link-local and CGNAT ranges,
redirects followed by hand with each hop re-checked, a 12-second timeout and a 2 MB cap.
The ranges are unit-tested. Structured `JobPosting` data is preferred where a board
publishes it; otherwise the page text is extracted.

Hardening: CORS is restricted to localhost unless `ALLOWED_ORIGIN` is set, uploads are
capped at 8 MB, text at 400,000 characters, requests at 60/minute per IP, every field is
type-checked, and 500s return a generic message while the detail goes to the server log.

## Design

Tokens, type scale and motion curves were read off [rows.gg](https://rows.gg) with
Playwright rather than eyeballed: warm off-white canvas, near-black ink, borders instead
of shadows, 90ms press recoil and 150–340ms transitions on their own easing curves.

Their type is small and this follows it: 13px base, 12px body copy, 11px for supporting
text, 16px section headings. Interactive parts that need real keyboard behaviour — the
results tabs and the template picker — use [Base UI](https://base-ui.com) primitives, so
arrow keys move between them and only the selected one sits in the tab order.

Two deliberate departures. Their greys and status colours sit between 2.6:1 and 4.3:1 at
the sizes used here, so each was darkened one step to clear 4.5:1 — same hues, same
hierarchy, both themes audit clean at every size. And colour never carries meaning alone:
every status ships with an icon and a word, focus rings are ink rather than the browser's
blue, and `prefers-reduced-motion` disables all animation.

</details>

---

## Licence

MIT — free to use, change and share. See [LICENSE](LICENSE).
