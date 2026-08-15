import { Dialog } from '@base-ui-components/react/dialog';

/**
 * The whole rubric, in one place, including the parts that undercut it.
 *
 * The project's claim is an open rubric — every point visible and arguable. That is only
 * true if the caveats are as easy to find as the score, so the disclaimers sit in the
 * same panel rather than in a footnote somebody has to hunt for.
 */
export function HowItScores() {
  return (
    <Dialog.Root>
      <Dialog.Trigger className="how-trigger">How this is scored</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop className="how-backdrop" />
        <Dialog.Popup className="how-popup">
          <div className="how-head">
            <Dialog.Title className="how-title">How this is scored</Dialog.Title>
            <Dialog.Close className="how-close" aria-label="Close">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </Dialog.Close>
          </div>

          <div className="how-body">
            <Dialog.Description className="how-lede">
              Five groups, 100 points. Leave the job advert out and the last group drops away, so the total is
              worked out of 75 instead. Every check states the test it ran, so you can disagree with any single
              one of them.
            </Dialog.Description>

            <h3>Parse Safety — 25 points</h3>
            <p>Whether software can read the file at all. This is the half that actually matters.</p>
            <ul>
              <li><b>Words stay whole (7)</b> — files exported from design tools store “Sk ills” instead of “Skills”, and a keyword search finds none of them.</li>
              <li><b>Reading order is clear (6)</b> — a PDF states its reading order in a structure tree. Without one, a parser guesses from where text sits, which is how a sidebar ends up stitched into your job bullets. An untagged file never scores full marks.</li>
              <li><b>Sensible length (4)</b> — under 300 words gives a parser nothing; over 1,100 spreads your keywords thin.</li>
              <li><b>Fonts and symbols are readable (4)</b> — Type 3 fonts store letters as little drawings with no record of which letter they are. Icon fonts and emoji arrive as nothing.</li>
              <li><b>Contact details sit in the body (4)</b> — many parsers skip page headers, footers and text boxes entirely.</li>
            </ul>

            <h3>Contact — 15 points</h3>
            <p>Whether it can find a way to reach you: email (5), phone (3), location (3), LinkedIn (2), and a link to your work (2).</p>
            <p className="how-note">
              That last one only counts in fields that expect it — design, code, marketing, writing. An accountant
              with no portfolio is not doing anything wrong, so the check is removed rather than failed.
            </p>

            <h3>Structure — 20 points</h3>
            <ul>
              <li><b>Standard section headings (6)</b> — software uses these to work out where your job history starts.</li>
              <li><b>Machine-readable dates (6)</b> — your years of experience are counted from these. A missing range can read as zero years.</li>
              <li><b>Newest job first (4)</b> — many systems take the first job they find as your current title.</li>
              <li><b>No duplicated dates (4)</b> — two jobs with identical dates is nearly always a copy-paste slip.</li>
            </ul>

            <h3>Impact Language — 15 points</h3>
            <p>
              Verb-first bullets (5), numbers in your results (5), bullet length (3), no filler or first person (2).
            </p>
            <p className="how-note">
              <b>No hiring software measures any of this.</b> It is here because a human decides what happens after
              the search, and this is what they skim. Treat it as writing advice, not as anything a machine checks.
            </p>

            <h3>Job Match — 25 points</h3>
            <ul>
              <li><b>Keyword coverage (14)</b> — how many of the advert’s terms your CV uses. Near-synonyms count, so “usability studies” satisfies “usability testing”.</li>
              <li><b>The job title appears (6)</b> — recruiters search by title before anything else. If no title can be read from the advert, the check is dropped rather than half-awarded.</li>
              <li><b>Top terms in your current role (5)</b> — recent work counts for more than the same skill under a 2019 job.</li>
            </ul>
            <p>
              The advert is read to work out which field it is for, and you are scored against that field’s
              vocabulary — clinical terms for a nursing post, accounting terms for an accounting post.
            </p>

            <h3 className="how-warn">What this score is not</h3>
            <ul>
              <li>
                <b>No real hiring system gives out a score from 100.</b> Greenhouse sorts people into five bands.
                Workday grades A to D. This number is ours, and it exists to compare one draft of your CV against
                your next one — nothing more.
              </li>
              <li>
                <b>Nothing here is rejecting you automatically.</b> Greenhouse states in its own documentation that
                it never advances or rejects anyone on its own. A recruiter decides.
              </li>
              <li>
                <b>The “75% of CVs are auto-rejected” figure has no research behind it.</b> It traces back to a
                company that shut down in 2013.
              </li>
              <li>
                <b>The weightings that actually rank you are invisible.</b> They are set by whoever posted the job,
                on controls you will never see. Any outside score is an informed guess at them.
              </li>
              <li>
                <b>The points are a judgement, not a standard.</b> Two parts are grounded in real specifications —
                ISO 32000 for fonts and ISO 14289 for reading order — but nobody publishes an official CV score,
                which is exactly why every scanner online gives you a different number.
              </li>
            </ul>

            <p className="how-note">
              What does hold true everywhere is much simpler: a detail the software cannot pull out is a detail
              nobody can search for. That is what Parse Safety and Contact protect, and it is the part worth taking
              seriously.
            </p>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
