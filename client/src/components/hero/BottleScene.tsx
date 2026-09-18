import { useId } from 'react';

/**
 * The real Al-Quds 1.5 L bottle, split into layers cut from the product photo
 * (`/assets/hero/bottle-*.webp`, generated from `water-1-5l.webp`). Everything is drawn in the photo's
 * own pixel space (1600 × 1598), so once the bottle is filled the composite matches the photo exactly
 * and the hero can cross-fade to it without a visible jump.
 */
export const BOTTLE = {
  /** Size of the source photo. */
  photo: { width: 1600, height: 1598 },
  /** Where the cut-out layers sit inside the photo. */
  box: { x: 560, y: 240, width: 376, height: 1220 },
  /** First row below the cap (the neck opening once the cap is removed). */
  neckY: 331,
  /** Horizontal centre of the neck. */
  centreX: 739,
  /** Water surface when the bottle is full (just under the neck). */
  fullLevel: 350,
  /** How far below the bottle the water starts, so it is hidden. */
  emptyOffset: 1300,
  layers: {
    plate: '/assets/hero/bottle-plate.webp',
    body: '/assets/hero/bottle-body.webp',
    cap: '/assets/hero/bottle-cap.webp',
    mask: '/assets/hero/bottle-mask.webp',
  },
} as const;

/** Two wave crests that loop horizontally (one period = 150 px, so a 150 px shift repeats seamlessly). */
const WAVE = `M400 0 ${'q37.5 -16 75 0 t75 0 '.repeat(5)}V1400 H400 Z`;

/**
 * Elements carry `data-h` hooks that `HeroIntro` animates:
 * water (rises), wave-back / wave-front (ripple), stream (pours in), drop (splashes), cap (drops on).
 */
export function BottleScene() {
  const id = useId();
  const { photo, box, neckY, centreX, fullLevel, layers } = BOTTLE;
  const mask = `${id}-mask`;
  const water = `${id}-water`;
  const stream = `${id}-stream`;

  return (
    <svg
      data-h="bottle"
      viewBox={`0 0 ${photo.width} ${photo.height}`}
      aria-hidden
      className="absolute inset-0 size-full"
    >
      <defs>
        {/* The bottle's own silhouette keeps the water inside the glass. */}
        <mask id={mask} maskUnits="userSpaceOnUse" x="0" y="0" width={photo.width} height={photo.height} style={{ maskType: 'alpha' }}>
          <image href={layers.mask} {...box} />
        </mask>
        <linearGradient id={water} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#9be3ff" />
          <stop offset="1" stopColor="#1499e0" />
        </linearGradient>
        <linearGradient id={stream} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#38bdf8" />
          <stop offset="0.5" stopColor="#e6f9ff" />
          <stop offset="1" stopColor="#0ea5e9" />
        </linearGradient>
      </defs>

      {/* the photo's background with the bottle removed */}
      <image href={layers.plate} x="0" y="0" width={photo.width} height={photo.height} />

      {/* water rising inside the real bottle */}
      <g mask={`url(#${mask})`}>
        <g data-h="water">
          <g transform={`translate(0 ${fullLevel})`}>
            <path data-h="wave-back" d={WAVE} fill="#5cc8f5" opacity="0.6" />
            <path data-h="wave-front" d={WAVE} fill={`url(#${water})`} opacity="0.9" />
          </g>
        </g>
      </g>

      {/* the real bottle (cap removed): glass is see-through, ribs and label stay solid */}
      <image href={layers.body} {...box} />

      {/* stream pouring from above into the open neck */}
      <g data-h="stream" style={{ transformBox: 'fill-box', transformOrigin: '50% 0%' }}>
        <rect x={centreX - 17} y={-420} width="34" height={neckY + 90 + 420} rx="17" fill={`url(#${stream})`} />
        <rect x={centreX - 4} y={-420} width="8" height={neckY + 90 + 420} rx="4" fill="#fff" opacity="0.75" />
      </g>
      {[0, 1, 2, 3].map((i) => (
        <circle key={i} data-h="drop" cx={centreX - 30 + i * 20} cy={neckY - 10} r="8" fill="#9be3ff" opacity="0" />
      ))}

      {/* the cap drops back on once the bottle is full */}
      <image data-h="cap" href={layers.cap} {...box} opacity="0" />
    </svg>
  );
}
