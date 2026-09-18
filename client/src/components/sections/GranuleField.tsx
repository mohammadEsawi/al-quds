import { useEffect, useRef } from 'react';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';

interface Granule {
  x: number; // -1..1 across the screen
  y: number;
  z: number; // depth, 0 = far, 1 = at the camera
  size: number;
  hue: number;
  seed: number;
}

/**
 * Plastic granules seen from inside the stream: they fly toward the camera, then settle into a wave.
 * Plain 2D canvas (no WebGL) so it stays light on phones; it pauses when off-screen and shows a
 * single still frame when the visitor prefers reduced motion.
 */
export function GranuleField({ className }: { className?: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    const el = canvas.current;
    const ctx = el?.getContext('2d');
    if (!el || !ctx) return;

    const small = window.innerWidth < 768;
    const count = small ? 120 : 340;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0;
    let h = 0;

    const granules: Granule[] = Array.from({ length: count }, (_, i) => ({
      x: Math.random() * 2 - 1,
      y: Math.random() * 2 - 1,
      z: Math.random(),
      size: 1.4 + Math.random() * 2.6,
      hue: 200 + Math.random() * 30,
      seed: i / count,
    }));

    const resize = () => {
      const rect = el.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      el.width = Math.round(w * dpr);
      el.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const smooth = (a: number, b: number, v: number) => {
      const k = Math.min(1, Math.max(0, (v - a) / (b - a)));
      return k * k * (3 - 2 * k);
    };

    let raf = 0;
    let visible = true;
    const start = performance.now();
    let last = start;

    const draw = (now: number) => {
      const time = (now - start) / 1000;
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const organise = reduced ? 1 : smooth(2.2, 5.5, time);

      ctx.clearRect(0, 0, w, h);
      for (const g of granules) {
        if (!reduced) {
          g.z += dt * (0.16 + g.seed * 0.1);
          if (g.z > 1) {
            g.z = 0.02;
            g.x = Math.random() * 2 - 1;
            g.y = Math.random() * 2 - 1;
          }
        }
        // perspective projection of the free-flying position
        const persp = 0.35 + g.z * 1.5;
        const fx = w / 2 + g.x * (w / 2) * persp;
        const fy = h / 2 + g.y * (h / 2) * persp;
        // resting position on a travelling wave
        const wx = g.seed * w;
        const wy = h * 0.62 + Math.sin(g.seed * 14 + time * 0.9) * 34 + Math.sin(g.seed * 5 - time * 0.5) * 22 + (g.y * 26);
        const x = fx + (wx - fx) * organise;
        const y = fy + (wy - fy) * organise;
        const r = g.size * (0.5 + g.z * 1.4) * (1 - organise * 0.25);
        ctx.beginPath();
        ctx.fillStyle = `hsla(${g.hue}, 70%, ${62 + g.z * 24}%, ${0.25 + g.z * 0.65})`;
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      if (!reduced && visible) raf = requestAnimationFrame(draw);
    };

    if (reduced) {
      draw(performance.now() + 6000);
    } else {
      raf = requestAnimationFrame(draw);
    }

    const observer = new IntersectionObserver(([entry]) => {
      visible = !!entry?.isIntersecting;
      if (visible && !reduced) {
        last = performance.now();
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(draw);
      }
    });
    observer.observe(el);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener('resize', resize);
    };
  }, [reduced]);

  return <canvas ref={canvas} aria-hidden className={className ?? 'absolute inset-0 size-full opacity-90'} />;
}
