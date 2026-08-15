import { Dialog } from '@base-ui-components/react/dialog';

/**
 * The full set of rules, in one place, with the limits of the rules.
 *
 * This project gives an open rubric. Each point is visible and you can disagree with it.
 * That is true only if the limits are as easy to find as the score. Thus the limits are
 * in this panel and not in a note at the bottom of a page.
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
              There are five groups and 100 points. If you give no job advert, the last group does not apply and
              the total comes from 75 points. Each check gives the test that it did. Thus you can disagree with
              any check.
            </Dialog.Description>

            <h3>Parse Safety, 25 points</h3>
            <p>These checks show if software can read the file. This is the part that is most important.</p>
            <ul>
              <li><b>Words stay complete (7).</b> A file from a design tool contains “Sk ills” in place of “Skills”. A keyword search cannot find these words.</li>
              <li><b>The reading order is clear (6).</b> A PDF gives its reading order in a structure tree. Without a tree, each program calculates the order from the position of the text. Thus a side column becomes part of your job details. A file with no tree does not get all the points.</li>
              <li><b>The length is correct (4).</b> Less than 300 words gives a program very little data. More than 1,100 words decreases the density of your keywords.</li>
              <li><b>The fonts and symbols are readable (4).</b> A Type 3 font keeps letters as drawings and does not record the applicable letter. An icon font and an emoji give no characters.</li>
              <li><b>The contact data is in the body (4).</b> Many programs do not read a page header, a page footer or a text box.</li>
            </ul>

            <h3>Contact, 15 points</h3>
            <p>
              These checks show if software can find a way to contact you: email address (5), telephone number
              (3), location (3), LinkedIn address (2) and a link to your work (2).
            </p>
            <p className="how-note">
              The last check applies only to fields that usually ask for a link, for example design, software,
              marketing and writing. An accountant with no portfolio does nothing incorrect. Thus the program
              removes the check and does not fail it.
            </p>

            <h3>Structure, 20 points</h3>
            <ul>
              <li><b>Usual section headings (6).</b> Software uses these headings to find the start of your job history.</li>
              <li><b>Dates a program can read (6).</b> A program calculates your years of experience from these dates. A date that is not there can count as zero years.</li>
              <li><b>The newest job is first (4).</b> Many programs use the first job in the file as your current job title.</li>
              <li><b>No dates occur two times (4).</b> Two jobs with the same dates are almost always a copy error.</li>
            </ul>

            <h3>Impact Language, 15 points</h3>
            <p>
              Items that start with a verb (5), numbers in your results (5), the length of each item (3), no
              filler words and no first person (2).
            </p>
            <p className="how-note">
              <b>No hiring software measures these things.</b> They are here because a person makes the decision
              after the search, and these are the parts that the person reads. Use them as advice about writing,
              not as a test that a machine does.
            </p>

            <h3>Job Match, 25 points</h3>
            <ul>
              <li><b>Keyword coverage (14).</b> The quantity of terms from the advert that your CV uses. Terms with almost the same meaning count. Thus “usability studies” is a match for “usability testing”.</li>
              <li><b>Your CV uses the job title (6).</b> Recruiters search by job title before they search for anything else. If the program cannot read a title from the advert, it removes this check.</li>
              <li><b>The most important terms are in your current job (5).</b> Recent work counts for more than the same skill in a job from 2019.</li>
            </ul>
            <p>
              The program reads the advert to find the applicable field. Then it gives you a score against the
              vocabulary of that field: clinical terms for a nursing advert, accounting terms for an accounting
              advert.
            </p>

            <h3 className="how-warn">What this score is not</h3>
            <ul>
              <li>
                <b>No hiring system gives a score from 100.</b> Greenhouse puts people into five groups. Workday
                gives a grade from A to D. This number is ours. Use it to compare one version of your CV with the
                next version, and for nothing more.
              </li>
              <li>
                <b>No system here refuses you automatically.</b> Greenhouse states in its documentation that it
                does not advance or refuse a person by itself. A recruiter makes the decision.
              </li>
              <li>
                <b>There is no research for the statement that systems refuse 75% of CVs.</b> That number comes
                from a company that closed in 2013.
              </li>
              <li>
                <b>You cannot see the weights that put you in order.</b> The employer sets them with controls
                that nobody outside the company can see. Thus each score from outside is an estimate.
              </li>
              <li>
                <b>These points are a judgement, not a standard.</b> Two parts use real specifications: ISO 32000
                for fonts and ISO 14289 for the reading order. But nobody publishes an official CV score. This is
                why each scanner on the internet gives a different number.
              </li>
            </ul>

            <p className="how-note">
              One rule is true for each system: if the software cannot get a detail, nobody can search for it.
              The Parse Safety and Contact groups protect that rule. This is the part that is important.
            </p>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
