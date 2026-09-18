import { forwardRef } from 'react';
import { gsap } from '@/lib/gsap';
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
  /** Radius of the rotating rim overlay (slightly inside the tire). */
  rimRadius: 40,
  /** Wheel centres in image pixels. */
  wheels: [
    [194, 309],
    [319, 309],
    [430, 309],
    [916, 303],
    [1331, 300],
    [1428, 300],
    [1510, 300],
    [1825, 300],
  ] as const,
};

/** Rotates every wheel of a truck element to `degrees`. */
export function spinWheels(truck: Element, degrees: number) {
  gsap.set(truck.querySelectorAll('[data-wheel]'), { rotation: degrees });
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
  const { width: W, height: H, rimRadius: r } = TRUCK;

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
      {TRUCK.wheels.map(([cx, cy]) => (
        <div
          key={`${cx}-${cy}`}
          data-wheel
          aria-hidden
          className="absolute overflow-hidden rounded-full will-change-transform"
          style={{
            left: `${((cx - r) / W) * 100}%`,
            top: `${((cy - r) / H) * 100}%`,
            width: `${((2 * r) / W) * 100}%`,
            aspectRatio: '1',
          }}
        >
          <img
            src={TRUCK.src}
            alt=""
            draggable={false}
            className="absolute max-w-none select-none"
            style={{
              width: `${(W / (2 * r)) * 100}%`,
              left: `${(-(cx - r) / (2 * r)) * 100}%`,
              top: `${(-(cy - r) / (2 * r)) * 100}%`,
            }}
          />
        </div>
      ))}
    </div>
  );
});
