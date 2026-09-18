import { useEffect, useRef, type RefObject } from 'react';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { useI18n } from '@/i18n/I18nProvider';

interface Particle {
  /** Where the particle starts (free flight) and how it drifts. */
  sx: number;
  sy: number;
  vx: number;
  vy: number;
  /** Target inside the lettering (NaN for ambient particles that never settle). */
  tx: number;
  ty: number;
  delay: number;
  duration: number;
  size: number;
  color: string;
  pigment: boolean;
  seed: number;
  /** Pointer push, smoothed. */
  ox: number;
  oy: number;
}

// Plastic granules are pale; pigments (colour masterbatch) are vivid.
const PIGMENTS = ['#22d3ee', '#38bdf8', '#0a6bb5', '#e11d48', '#f472b6', '#f59e0b', '#a78bfa', '#34d399'];
const PELLETS = ['#f4f8fc', '#e3ecf5', '#cfdcea'];

const easeOut = (p: number) => 1 - (1 - p) ** 3;
const pigmentAlpha = (p: Particle) => (p.pigment ? 1 : 0.92);
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

interface GranuleNameProps {
  /** The company name that the granules and pigments assemble into. */
  text: string;
  /** Element whose box the lettering should fill (it keeps the layout space). */
  anchorRef: RefObject<HTMLElement | null>;
  className?: string;
}

/**
 * Plastic granules and colour pigments fly in and settle into the company name.
 * Plain 2D canvas — light enough for phones; pauses off-screen; the pointer / a finger pushes the
 * particles aside and they spring back. With `prefers-reduced-motion` only the finished lettering is drawn.
 */
export function GranuleName({ text, anchorRef, className }: GranuleNameProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const reduced = usePrefersReducedMotion();
  const { locale } = useI18n();

  useEffect(() => {
    const el = canvas.current;
    const ctx = el?.getContext('2d');
    if (!el || !ctx) return;

    const isArabic = locale === 'ar';
    const family = isArabic ? '"Noto Kufi Arabic", "Tajawal", sans-serif' : '"Inter", "Noto Kufi Arabic", sans-serif';
    const weight = isArabic ? 800 : 700;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = 0;
    let height = 0;
    let particles: Particle[] = [];
    let fontSize = 100;
    const pointer = { x: -9999, y: -9999, active: false };

    const start = performance.now();
    let raf = 0;
    let visible = true;
    let disposed = false;
    let resizeTimer = 0;

    /** Samples the lettering into a list of points and (re)creates the particles. */
    function build() {
      const rect = el!.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      el!.width = Math.round(width * dpr);
      el!.height = Math.round(height * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);

      const anchor = anchorRef.current?.getBoundingClientRect();
      const area = anchor
        ? { cx: anchor.left - rect.left + anchor.width / 2, cy: anchor.top - rect.top + anchor.height / 2, w: anchor.width, h: anchor.height }
        : { cx: width / 2, cy: height / 2, w: width * 0.8, h: height * 0.3 };

      // Draw the name once, off-screen, and read back which pixels are "ink".
      const off = document.createElement('canvas');
      off.width = Math.ceil(width);
      off.height = Math.ceil(height);
      const octx = off.getContext('2d', { willReadFrequently: true })!;
      octx.direction = isArabic ? 'rtl' : 'ltr';
      octx.textAlign = 'center';
      octx.textBaseline = 'middle';
      octx.fillStyle = '#fff';

      fontSize = Math.min(area.h * 0.92, 210);
      octx.font = `${weight} ${fontSize}px ${family}`;
      const measured = octx.measureText(text).width;
      const maxWidth = area.w * 0.94;
      if (measured > maxWidth) {
        fontSize *= maxWidth / measured;
        octx.font = `${weight} ${fontSize}px ${family}`;
      }
      octx.fillText(text, area.cx, area.cy);

      const data = octx.getImageData(0, 0, off.width, off.height).data;
      const ink: [number, number][] = [];
      const step = 2;
      for (let y = 0; y < off.height; y += step) {
        for (let x = 0; x < off.width; x += step) {
          if ((data[(y * off.width + x) * 4 + 3] ?? 0) > 128) ink.push([x, y]);
        }
      }

      const small = width < 640;
      const budget = small ? 2300 : 5400;
      // Shuffle, then take as many points as we have particles for.
      for (let i = ink.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [ink[i], ink[j]] = [ink[j]!, ink[i]!];
      }
      const targets = ink.slice(0, budget);
      const scale = Math.max(0.55, fontSize / 110);

      const left = area.cx - area.w / 2;
      particles = targets.map(([tx, ty], i) => {
        const pigment = i % 5 < 2; // 40% pigments, 60% plastic pellets
        // Letters assemble along the reading direction (right-to-left for Arabic).
        const along = clamp01(isArabic ? (area.cx + area.w / 2 - tx) / area.w : (tx - left) / area.w);
        return {
          sx: Math.random() * width,
          sy: Math.random() * height,
          vx: (Math.random() - 0.5) * 34,
          vy: (Math.random() - 0.5) * 34,
          tx,
          ty,
          delay: 0.4 + along * 1.7 + Math.random() * 0.6,
          duration: 1.3 + Math.random() * 1.1,
          size: (pigment ? 1.0 + Math.random() * 0.8 : 1.25 + Math.random() * 0.85) * scale,
          color: pigment ? PIGMENTS[i % PIGMENTS.length]! : PELLETS[i % PELLETS.length]!,
          pigment,
          seed: Math.random() * 100,
          ox: 0,
          oy: 0,
        };
      });

      // Background granules that keep floating and never settle.
      const ambient = Math.round(budget * 0.3);
      for (let i = 0; i < ambient; i += 1) {
        const pigment = Math.random() < 0.4;
        particles.push({
          sx: Math.random() * width,
          sy: Math.random() * height,
          vx: (Math.random() - 0.5) * 22,
          vy: (Math.random() - 0.5) * 22,
          tx: NaN,
          ty: NaN,
          delay: 0,
          duration: 1,
          size: (pigment ? 1 + Math.random() * 1.2 : 1.4 + Math.random() * 1.6) * Math.max(0.7, scale * 0.8),
          color: pigment ? PIGMENTS[i % PIGMENTS.length]! : PELLETS[i % PELLETS.length]!,
          pigment,
          seed: Math.random() * 100,
          ox: 0,
          oy: 0,
        });
      }
    }

    function draw(now: number) {
      const t = reduced ? 99 : (now - start) / 1000;
      ctx!.clearRect(0, 0, width, height);

      for (const pass of [false, true]) {
        // pellets first, pigments on top so the colours stay visible
        for (const p of particles) {
          if (p.pigment !== pass) continue;
          let x: number;
          let y: number;
          let alpha: number;

          if (Number.isNaN(p.tx)) {
            const wrap = (v: number, max: number) => ((v % max) + max) % max;
            x = reduced ? p.sx : wrap(p.sx + p.vx * t, width);
            y = reduced ? p.sy : wrap(p.sy + p.vy * t, height);
            alpha = 0.32;
          } else {
            const e = easeOut(clamp01((t - p.delay) / p.duration));
            const fx = p.sx + p.vx * Math.min(t, p.delay + p.duration);
            const fy = p.sy + p.vy * Math.min(t, p.delay + p.duration);
            const swirl = (1 - e) * 46 * Math.sin(t * 2.2 + p.seed);
            x = fx + (p.tx - fx) * e + swirl * 0.6;
            y = fy + (p.ty - fy) * e + swirl;
            const settled = e > 0.98 && !reduced;
            if (settled) {
              x += Math.sin(t * 1.5 + p.seed * 7) * 0.55;
              y += Math.cos(t * 1.3 + p.seed * 5) * 0.55;
            }
            alpha = 0.35 + e * (pigmentAlpha(p) - 0.35);
          }

          // pointer push, smoothed so particles glide away and back
          let pushX = 0;
          let pushY = 0;
          if (pointer.active) {
            const dx = x - pointer.x;
            const dy = y - pointer.y;
            const dist = Math.hypot(dx, dy);
            const radius = 90;
            if (dist < radius && dist > 0.01) {
              const force = (1 - dist / radius) * 46;
              pushX = (dx / dist) * force;
              pushY = (dy / dist) * force;
            }
          }
          p.ox += (pushX - p.ox) * 0.2;
          p.oy += (pushY - p.oy) * 0.2;

          ctx!.globalAlpha = alpha;
          ctx!.fillStyle = p.color;
          ctx!.beginPath();
          ctx!.arc(x + p.ox, y + p.oy, p.size, 0, Math.PI * 2);
          ctx!.fill();
        }
      }
      ctx!.globalAlpha = 1;
    }

    const loop = (now: number) => {
      if (disposed) return;
      draw(now);
      if (visible && !reduced) raf = requestAnimationFrame(loop);
    };

    const onMove = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      pointer.x = e.clientX - rect.left;
      pointer.y = e.clientY - rect.top;
      pointer.active = true;
    };
    const onLeave = () => {
      pointer.active = false;
    };
    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        build();
        if (reduced) draw(performance.now());
      }, 150);
    };

    const observer = new IntersectionObserver(([entry]) => {
      visible = !!entry?.isIntersecting;
      if (visible && !reduced) {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(loop);
      }
    });

    // Wait for the display font so the lettering is sampled with the right glyphs.
    const ready = Promise.race([
      document.fonts.load(`${weight} 100px ${family}`, text).catch(() => undefined),
      new Promise((resolve) => window.setTimeout(resolve, 1500)),
    ]);
    void ready.then(() => {
      if (disposed) return;
      build();
      if (reduced) draw(performance.now());
      else raf = requestAnimationFrame(loop);
      observer.observe(el);
    });

    window.addEventListener('resize', onResize);
    // Listen on the window so the (non-interactive) canvas behind the text still reacts.
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerleave', onLeave);
    el.addEventListener('pointerleave', onLeave);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      window.clearTimeout(resizeTimer);
      observer.disconnect();
      window.removeEventListener('resize', onResize);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerleave', onLeave);
      el.removeEventListener('pointerleave', onLeave);
    };
  }, [text, anchorRef, reduced, locale]);

  return <canvas ref={canvas} aria-hidden className={className ?? 'absolute inset-0 size-full'} />;
}
