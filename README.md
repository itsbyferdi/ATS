# ATS CV Scoring

**Find out if hiring software can read your CV. Then make a version that it can read.**

Most companies put your CV through software before a person sees it. The software must
get your name, your email address, your job titles and your dates out of the file. If it
cannot do this, your data goes into the incorrect field or into no field. Nobody tells
you the reason.

This tool shows you what that software gets. It gives your CV a score against an open
list of checks, and it explains each point. It can also write your CV again in a clean
form that you can download.

![The scanner scoring a CV](docs/screenshot.png)

---

## Your CV stays on your computer

This matters, so it comes first.

**Your CV never leaves your computer.** There is no account, no sign-up, no tracking, no
analytics, and nothing is stored anywhere.

This is the exact operation, because a statement about privacy is easy to make:

- **The tool reads your CV in your browser.** It sends nothing to any other place. You
  can disconnect the internet and the tool operates.
- **If you start the optional second reader**, the tool sends your CV to that reader.
  The reader is a small program on *your own machine*. It listens on `127.0.0.1` and
  refuses each connection from a different machine. It keeps the file in memory and
  removes it when it sends the answer. This is a local transfer, not an upload, but it
  is a transfer. Thus this document gives it.
- **Only one thing goes to the internet:** a link to a job advert. This occurs only when
  you put in a link and press the button. Your CV is not part of that request.

This is a test, not a statement. `scripts/check-privacy.mjs` operates the full tool in a
browser. It puts a marker string in the CV, records each network request of the page, and
fails if a request goes to a different machine or contains the marker. You can run it:

```bash
npx playwright install chromium   # one-off
npm run dev                       # in another terminal
npm run check:privacy
```

---

## What you need first

You need one free program: **Node.js**. It permits your computer to run this type of
project. You do not have to know more about it.

1. Go to **[nodejs.org](https://nodejs.org)**
2. Download the version with the label **LTS**. This is "long term support", the stable version.
3. Open the downloaded file and click through the installer, accepting the defaults

That is the only thing you need to install.

---

## Getting it running

You will use a program with the name **Terminal**. It is a window where you type
commands. You do not click buttons. Your computer includes this program.

**To open it:**

- **Mac**: press `Cmd` + `Space`, type `Terminal`, then press Enter
- **Windows**: press the Start button, type `PowerShell`, then press Enter
- **Linux**: press `Ctrl` + `Alt` + `T`

Do these four steps. **Type each line, then press Enter.** Wait for each step to
complete before you start the next step.

### Step 1. Download this project

```bash
git clone https://github.com/itsbyferdi/ats-cv-scoring.git
```

If you get an error about `git`, download the project as a folder. Click the green
**Code** button at the top of this page on GitHub. Then select **Download ZIP** and open
the ZIP file.

### Step 2. Go into the project folder

```bash
cd ats-cv-scoring
```

`cd` is "change directory". This command gives the folder to the terminal.

### Step 3. Install the parts

```bash
npm install
```

This command downloads the parts that the project uses. It takes one or two minutes and
writes much text. This is correct. Some warnings are also correct.

### Step 4. Start the tool

```bash
npm run dev
```

You will see something like:

```
➜  Local:   http://localhost:5173/
```

**Open that address in your web browser.** The tool is now running.

> **Do not close the terminal window** while you use the tool. If you close it, the tool
> stops. To stop the tool, click the terminal and press `Ctrl` + `C`.
>
> **The next time**, do only steps 2 and 4. You install the parts one time only.

---

## Using it

The tool walks you through four steps, one screen at a time.

### 1. Your CV

Put in the exact file that you send to employers. The tool accepts `.pdf`, `.docx`,
`.txt` and `.md`. As an alternative, put in the text. Use the real file and not a
corrected copy, because the file is one half of the test.

### 2. The job

Put in the job advert. This is optional. With the advert, you also get a score for the
agreement between your words and the job. Without the advert, you get a score for the
format and the structure, from 75 points and not from 100 points.

**You can put in a link and not the text.** Give the address of the advert and the tool
reads it. This needs the optional second part (see
[Optional extras](#optional-extras-advanced)), because a browser cannot get data from a
different site. The tool operates with most job boards. Some sites show the advert only
after you sign in. If the tool cannot read your advert, copy the text and put it in.

**The tool operates for any job.** It reads the advert and finds the applicable field.
Then it gives a score against the vocabulary of that field: clinical terms for a nursing
advert, accounting terms for an accounting advert. There are sample adverts from six
fields. A job in an unknown field also operates, because the tool counts the terms that
occur many times in the advert.

### 3. Results

Five things to look at, one at a time:

| Tab | What it tells you |
|---|---|
| **Score** | Your total, and how it breaks down |
| **Do these first** | The handful of fixes worth the most points |
| **Keywords** | Words the advert leans on that your CV never says |
| **What software sees** | The data that a computer got. Make sure that it is correct |
| **All checks** | Every single test, with the reason for its score |

**The tab "What software sees" is the most useful tab.** If your email address or your
job dates are not there, they are also not there for each employer.

### 4. Rebuild

The tool writes your CV again in a clean form. Select one of three layouts, look at the
score before and after, then download the file.

| Layout | What it does | Choose it when |
|---|---|---|
| **Classic** | Summary, experience, education, skills | You are not sure. This is the safe default |
| **Compact** | No summary, skills on one line | You have many jobs and want them on page one |
| **Skills first** | Skills above your job history | You are changing field, or the advert is tool-heavy |

**Which file must I send?** Send the **DOCX** file. Programs read this format most
reliably. The PDF file is also correct, because your browser prints it and the text stays
readable. Use Markdown to edit your own copy. Do not send it.

---

## What the score actually means

To be clear: **this number is ours. It is not the number of a hiring system.**

No hiring system gives a score from 100. Greenhouse puts people into five groups and
states in its documentation that it does not refuse or advance a person by itself.
Workday gives a grade from A to D. A recruiter makes the decision. The employer sets the
weights that put you in order, with controls that you cannot see.

You can also find the statement that systems refuse 75% of CVs. There is no research for
that number. It comes from a company that closed in 2013.

Use this score to compare one version of your CV with your next version, and for nothing
more. One rule is true for each system:

> **If the software cannot get a detail, nobody can search for it.**

The Parse Safety and Contact checks protect this rule. This is the important part.

One more point: no hiring software measures the **Impact Language** group, which covers
verbs and numbers in your items. That group is here because a person reads your CV after
the search, and these are the parts that the person reads.

---

## Common problems

**"command not found: npm"**
Node.js is not installed, or you opened the terminal before you installed it. Close the
terminal, open a new terminal and try again.

**"Port 5173 is in use"**
The tool operates in a different window. Find an address such as `localhost:5174` in the
text and use that address.

**The page is empty, or nothing occurs**
Make sure that the terminal is open and shows the `Local:` address.

**My score is 0 and the tool says "The file contains no text"**
The tool operates correctly. This is not a fault. Your PDF contains pictures of letters
and not letters. This occurs when a design tool such as Figma, Sketch or Canva exports a
PDF. Make the file again in Word or Google Docs, or send the DOCX file.

**You can do this test on any file.** Open the file, press `Ctrl`+`A`, then press
`Ctrl`+`C`. Put the result in a notepad. If the result is not clear readable text, no
hiring software can read the file.

**The tool says that there is not sufficient text**
The tool could not get sufficient readable text from your file. Make the original file
again in Word or Google Docs, then try again. If the tool shows a warning but gives you
a result, read that result with care. The tool keeps each word, but it can put some text
in the incorrect section.

---

## Optional extras (advanced)

This step is optional. It adds two functions. First, a second reader for PDF files. Thus
the tool can tell you when two readers do not agree about your file, which is an
important warning. Second, the tool can read a job advert from a link.

Open a **second** terminal window, go to the project folder, and run:

```bash
npm run dev:api
```

The web page finds the second part automatically. The second reader also needs a free
tool with the name `poppler`:

```bash
# Mac
brew install poppler

# Debian / Ubuntu Linux
sudo apt-get install poppler-utils
```

Without `poppler`, the tool operates. It shows that the second reader is not available.

---

## Is this safe to run?

Yes. These are the reasons:

- **The tool uploads nothing.** It reads your CV in your browser and the CV stays there.
- **There are no accounts, no tracking and no analytics.** You do not sign up.
- **The project contains no secrets and no keys.**
- **The optional server listens only to your own computer.** A website cannot reach it.
  If you put the server on the internet, set `ALLOWED_ORIGIN` to your address.
- **A file has a limit of 8 MB.** The server keeps the file in memory and removes it when
  it sends the answer.
- **The example CV is not a real person.** It contains no data about a real person.

If you find a security problem, please open an issue on GitHub.

---

<details>
<summary><b>For developers</b>: architecture, tests and the reasons for the rubric</summary>

## Layout

```
packages/core   @ats/core   The scoring engine and the rebuilder. Pure, no runtime deps.
apps/web        @ats/web    React single page. Vite, TypeScript, CSS with design tokens.
apps/api        @ats/api    Express. Optional. It adds the second PDF reader.
```

The engine is deliberately separate from both. Text goes in, a report comes out; it knows
nothing about files, HTTP, or React. That is what makes the rubric testable.

```bash
npm test         # vitest. 116 tests for the engine and the API
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
  one, each reader must calculate the order from the position of the text. Thus a side
  column becomes part of your job items. A PDF with no structure tree never gets all the
  points for the reading order.

### Any profession, not just the one it was written for

The vocabulary for each field is in `domains.ts`, in packs: software, design, data,
product, marketing, sales, finance, HR, operations, healthcare, education, legal,
support, writing, science and skilled trades. There is also a `UNIVERSAL` set for each
advert. An advert selects the packs that contain its cues. Thus the tool ranks a nursing
advert with clinical vocabulary and not with design vocabulary. To add a field, add one
entry. You do not have to change anything else. A field with no pack also operates,
because the tool counts unknown terms that occur many times.

### No free points, and no unfair penalties

If a check cannot operate, for example when the tool cannot read a job title from the
advert, the tool removes the check from the total. It does not give half of the points.
The opposite is also true: the check for a link to your work counts only in fields that
expect one. An accountant with no portfolio does nothing incorrect.

## Rebuilding

`parseCv` turns flat text back into structure; three templates render it to text,
Markdown and HTML. Exports are real OOXML (via `docx`) for Word, and the browser's own
print pipeline for PDF, so both carry genuine text layers.

**It checks its own work.** The parser is heuristic, and on a CV whose text layer is
already broken it fails badly. `rebuildCv` compares words in against words retained and
refuses the result if more than one tenth of the words are missing. A "corrected" CV
that lost two jobs does real damage to the user. The tool discards nothing: each block
with no section goes below "Additional information".

## API

```
GET  /api/health
POST /api/extract   multipart/form-data, field "file"  →  text + per-reader diagnostics
POST /api/score     { text, jobDescription?, mutedKeywords?, diagnostics?, engines? }
POST /api/job       { url }  →  { text, source, structured }
```

Send `engines`, which is each reader that operated and not only the best one.
`/api/extract` returns the reader that got the most text. A score from only that reader
hides the condition where a second reader got nothing. That condition is the purpose of
two readers.

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
text and 16px section headings. Two controls need correct keyboard operation: the
results tabs and the template picker. They use [Base UI](https://base-ui.com). Thus the
arrow keys move between the items, and only the selected item is in the tab order.

Two deliberate departures. Their greys and status colours sit between 2.6:1 and 4.3:1 at
the sizes that this app uses. Thus each colour is one step darker and gives more than
4.5:1. The hues and the order stay the same. Both themes pass at each size. Colour is
never the only source of meaning: each status has an icon and a word, each focus ring
uses the ink colour and not the blue of the browser, and `prefers-reduced-motion` stops
all animation.

</details>

---

## Licence

MIT. You can use, change and share this project. See [LICENSE](LICENSE).
