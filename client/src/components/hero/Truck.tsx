import { forwardRef } from 'react';
import { cn } from '@/lib/cn';

/**
 * Geometry of `/assets/hero/hero-truck.webp` (the truck cut out of the supplied hero photo).
 * If the image is replaced, update these pixel values.
 */
export const TRUCK = {
  src: '/assets/hero/hero-truck.webp',
  width: 1891,
  height: 362,
  /** Outer tire radius, used to keep wheel rotation in sync with the distance travelled. */
  tireRadius: 47,
  /**
   * The wheels as they appear in the photo (measured by fitting an ellipse to each silver rim):
   * `hx, hy` hub centre in image pixels (the pivot the wheel really turns around — not the centre of the
   * rim outline, which the camera angle shifts), `minor`/`major` rim ellipse axes, `phi` direction of the
   * minor axis in degrees, and `speed` how much faster a smaller (farther) wheel turns than the nearest one.
   * The photo is viewed at an angle, so rims are ovals; they are turned in circle space and squashed
   * back, which keeps every lug on a true elliptical orbit instead of wobbling.
   */
  wheels: [
    { hx: 196.84, hy: 309.73, minor: 53.69, major: 55.89, phi: 46.8, speed: 1.000 },
    { hx: 320.36, hy: 309.06, minor: 52.41, major: 54.12, phi: 30.9, speed: 1.033 },
    { hx: 431.13, hy: 308.17, minor: 51.82, major: 53.57, phi: 30.0, speed: 1.043 },
    { hx: 913.88, hy: 304.66, minor: 49.18, major: 54.06, phi: 37.0, speed: 1.034 },
    { hx: 1332.89, hy: 301.20, minor: 43.58, major: 51.94, phi: 18.4, speed: 1.076 },
    { hx: 1426.22, hy: 299.93, minor: 42.31, major: 50.43, phi: 9.8, speed: 1.108 },
    { hx: 1504.24, hy: 300.73, minor: 40.79, major: 49.36, phi: 8.7, speed: 1.132 },
    { hx: 1829.51, hy: 302.21, minor: 31.55, major: 47.10, phi: -1.2, speed: 1.187 },
  ] as const,
};

/**
 * Each wheel is drawn as several copies of the same wheel photo, turned a little apart from each other.
 * At rest they sit exactly on top of each other (one sharp wheel). When the truck is fast they fan out
 * over the angle the wheel covers in one frame, which is what a camera shutter records — a smooth
 * motion blur instead of a wheel that flickers or seems to spin backwards (a 5-lug wheel turning 40°+
 * per frame is impossible to read without it).
 */
const WHEEL_LAYERS = 5;
/** The turning disc covers this share of the rim's diameter, fading out towards its edge. */
const DISC = 0.92;
const FEATHER = 'radial-gradient(closest-side, #000 55%, transparent 100%)';
/** Fraction of a frame's rotation that the blur covers (like a 216° camera shutter). */
const SHUTTER = 0.6;

interface SpinState {
  layers: { el: HTMLElement; speed: number }[][];
  /** Last angle seen; null until the first call so the first frame never counts as a huge jump. */
  angle: number | null;
  speed: number;
}
const spinStates = new WeakMap<Element, SpinState>();

function spinState(truck: Element): SpinState {
  let state = spinStates.get(truck);
  if (!state) {
    const layers: SpinState['layers'] = Array.from({ length: WHEEL_LAYERS }, () => []);
    truck.querySelectorAll<HTMLElement>('[data-wheel-layer]').forEach((el) =>
      layers[Number(el.dataset['wheelLayer'])]?.push({ el, speed: Number(el.dataset['wheelSpeed'] ?? 1) }),
    );
    state = { layers, angle: null, speed: 0 };
    spinStates.set(truck, state);
  }
  return state;
}

/** Turns every wheel of a truck element to `degrees`, blurring the motion in proportion to the speed. */
export function spinWheels(truck: Element, degrees: number) {
  const state = spinState(truck);
  // Degrees moved since the last call, lightly smoothed so the blur width does not flicker with frame timing.
  state.speed = state.speed * 0.55 + Math.abs(degrees - (state.angle ?? degrees)) * 0.45;
  state.angle = degrees;
  const spread = Math.min(state.speed, 120) * SHUTTER;

  state.layers.forEach((layer, index) => {
    const offset = (index / (WHEEL_LAYERS - 1) - 0.5) * spread;
    // Farther wheels are smaller, so they turn faster for the same distance travelled.
    for (const { el, speed } of layer) el.style.transform = `rotate(${((degrees + offset) * speed).toFixed(2)}deg)`;
  });
}

/** Degrees a wheel turns after the truck rolled `distancePx` when it is rendered `renderedWidth` px wide. */
export function wheelDegrees(distancePx: number, renderedWidth: number) {
  const radius = TRUCK.tireRadius * (renderedWidth / TRUCK.width);
  return (distancePx / radius) * (180 / Math.PI);
}

interface TruckProps {
  alt?: string;
  className?: string;
  eager?: boolean;
}

/**
 * The Al-Quds distribution truck. The wheel discs are cropped from the same photo, so they can rotate
 * on their own while the body stays still — no fake or redrawn artwork.
 */
export const Truck = forwardRef<HTMLDivElement, TruckProps>(function Truck(
  { alt = '', className, eager },
  ref,
) {
  const { width: W, height: H } = TRUCK;

  return (
    <div ref={ref} className={cn('relative', className)} style={{ aspectRatio: `${W} / ${H}` }}>
      <img
        src={TRUCK.src}
        alt={alt}
        width={W}
        height={H}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        draggable={false}
        className="absolute inset-0 size-full select-none"
      />
      {TRUCK.wheels.map((wheel) => {
        const k = wheel.minor / wheel.major;
        // Diameter of the turning disc in "circle space" (image px), a little inside the rim.
        const d = wheel.major * DISC;
        const squash = `rotate(${wheel.phi}deg) scale(${k.toFixed(4)}, 1) rotate(${-wheel.phi}deg)`;
        const unsquash = `rotate(${wheel.phi}deg) scale(${(1 / k).toFixed(4)}, 1) rotate(${-wheel.phi}deg)`;
        return (
          <div
            key={`${wheel.hx}-${wheel.hy}`}
            aria-hidden
            className="absolute overflow-hidden rounded-full"
            style={{
              left: `${((wheel.hx - d / 2) / W) * 100}%`,
              top: `${((wheel.hy - d / 2) / H) * 100}%`,
              width: `${(d / W) * 100}%`,
              aspectRatio: '1',
              transform: squash,
              // Soft edge: whatever is not perfectly symmetric near the rim fades into the still photo.
              maskImage: FEATHER,
              WebkitMaskImage: FEATHER,
            }}
          >
            {/* Layer 0 is fully opaque, layer n has 1/(n+1) opacity: together an even average of all copies. */}
            {Array.from({ length: WHEEL_LAYERS }, (_, layer) => (
              <div
                key={layer}
                data-wheel
                data-wheel-layer={layer}
                data-wheel-speed={wheel.speed}
                className="absolute inset-0 will-change-transform"
                style={{ opacity: 1 / (layer + 1) }}
              >
                <div className="absolute inset-0" style={{ transform: unsquash }}>
                  <img
                    src={TRUCK.src}
                    alt=""
                    draggable={false}
                    decoding="async"
                    className="absolute max-w-none select-none"
                    style={{
                      width: `${(W / d) * 100}%`,
                      left: `${(-(wheel.hx - d / 2) / d) * 100}%`,
                      top: `${(-(wheel.hy - d / 2) / d) * 100}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
});
