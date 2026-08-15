import type { Band, BandKey } from '@ats/core';

const BAND_VAR: Record<BandKey, string> = {
  strong: 'var(--good)',
  nearly: 'var(--warning)',
  'needs-work': 'var(--serious)',
  'high-risk': 'var(--critical)',
};

const BAND_ICON: Record<BandKey, string> = {
  strong: '✓',
  nearly: '!',
  'needs-work': '!',
  'high-risk': '✕',
};

const RADIUS = 56;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

interface Props {
  score: number;
  band: Band;
  /** Denominator shown under the ring. 75 when Job Match is switched off. */
  outOf?: number;
}

export function ScoreHeader({ score, band, outOf = 100 }: Props) {
  const colour = BAND_VAR[band.key];

  return (
    <div className="score-header">
      <div className="gauge">
        <svg width="132" height="132" viewBox="0 0 132 132" role="img" aria-label={`Score ${score} out of 100`}>
          <circle cx="66" cy="66" r={RADIUS} fill="none" stroke="var(--track)" strokeWidth="11" />
          {score > 0 && (
            <circle
              cx="66"
              cy="66"
              r={RADIUS}
              fill="none"
              stroke={colour}
              strokeWidth="11"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={CIRCUMFERENCE * (1 - score / 100)}
              transform="rotate(-90 66 66)"
              style={{ transition: 'stroke-dashoffset .7s cubic-bezier(.22,1,.36,1)' }}
            />
          )}
        </svg>
        <div className="gauge-value">
          <span className="gauge-number">{score}</span>
          <span className="gauge-denominator">of 100</span>
        </div>
      </div>

      <div className="verdict">
        {/* Icon and word carry the meaning; colour only reinforces it. */}
        <p className="verdict-band">
          <span className="verdict-dot" style={{ background: colour }} aria-hidden />
          <span style={{ color: colour }} aria-hidden>
            {BAND_ICON[band.key]}
          </span>
          {band.label}
        </p>
        <p className="verdict-advice">{band.advice}</p>
        {outOf !== 100 && (
          <p className="verdict-note">Worked out of {outOf} points, because there is no job description yet.</p>
        )}
        <ul className="verdict-scale">
          <li><i style={{ background: 'var(--critical)' }} />0–44</li>
          <li><i style={{ background: 'var(--serious)' }} />45–64</li>
          <li><i style={{ background: 'var(--warning)' }} />65–79</li>
          <li><i style={{ background: 'var(--good)' }} />80–100</li>
        </ul>
      </div>
    </div>
  );
}
