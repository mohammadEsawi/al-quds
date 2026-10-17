import { useEffect, useState } from 'react';

// One wave tile (200×40), repeated twice side by side so a layer can loop seamlessly (see the
// `water-wave-drift` keyframes in index.css, which slide a layer by exactly one tile).
const TILE = 'M0,22 Q25,6 50,22 T100,22 T150,22 T200,22 V40 H0 Z';
const TILE_PATH = `${TILE}M200,22 Q225,6 250,22 T300,22 T350,22 T400,22 V40 H200 Z`;

/**
 * The water page hero's backdrop: the water rises when the page loads — like a pool filling — then
 * two wave layers keep drifting sideways at different speeds for a calm, moving-water feel. Motion
 * that should never stop is handled by CSS keyframes (cheaper than JS); only the one-shot "rise" on
 * mount is driven from React. `prefers-reduced-motion` is handled globally in index.css.
 */
export function WaterWaves() {
  const [risen, setRisen] = useState(false);

  useEffect(() => {
    // A frame late, so the browser commits the 0% state first and the rise is a real transition.
    const id = requestAnimationFrame(() => setRisen(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div aria-hidden className="absolute inset-x-0 bottom-0 h-[58%] overflow-hidden">
      <div
        className="absolute inset-x-0 bottom-0 transition-[height] duration-[1600ms] ease-out"
        style={{ height: risen ? '100%' : '0%' }}
      >
        {/* solid fill under the waves, so there is never a gap while they drift */}
        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-primary-dark" />

        <svg
          className="absolute inset-x-0 bottom-0 h-full w-[200%] text-primary-light/45"
          style={{ animation: 'water-wave-drift 18s linear infinite' }}
          viewBox="0 0 400 40"
          preserveAspectRatio="none"
        >
          <path d={TILE_PATH} fill="currentColor" />
        </svg>
        <svg
          className="absolute inset-x-0 bottom-0 h-[85%] w-[200%] text-primary"
          style={{ animation: 'water-wave-drift 11s linear infinite reverse' }}
          viewBox="0 0 400 40"
          preserveAspectRatio="none"
        >
          <path d={TILE_PATH} fill="currentColor" />
        </svg>
      </div>
    </div>
  );
}
