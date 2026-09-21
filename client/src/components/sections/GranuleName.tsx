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

// The logo is rebuilt in its own colours, lightened so it reads on the dark hero.
const LOGO_BLUE = ['#2f86dd', '#4a9be8', '#1f74cc', '#6ab0f0'];
const LOGO_RED = ['#e11d48', '#f43f5e', '#ef4444', '#fb7185'];
const LOGO_GREY = ['#cfdcea', '#e3ecf5', '#aab7c6', '#f4f8fc'];

/** Picks a granule colour for one logo pixel from its original colour. */
function logoColor(r: number, g: number, b: number, i: number): string {
  const palette = r > b * 1.35 && r > g * 1.35 ? LOGO_RED : b > r * 1.25 && b > g ? LOGO_BLUE : LOGO_GREY;
  return palette[i % palette.length]!;
}

const easeOut = (p: number) => 1 - (1 - p) ** 3;
const pigmentAlpha = (p: Particle) => (p.pigment ? 1 : 0.92);
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

interface GranuleNameProps {
  /** The company name that the granules and pigments assemble into, one entry per line. */
  lines: readonly string[];
  /** The same name split into more (shorter) lines, used on phones so the lettering can be bigger. */
  compactLines?: readonly string[];
  /** The logo, which assembles above the name (in its own colours). Skipped when it cannot be read. */
  logoSrc?: string;
  /** Element whose box the lettering should fill (it keeps the layout space). */
  anchorRef: RefObject<HTMLElement | null>;
  className?: string;
}

/**
 * Plastic granules and colour pigments fly in and settle into the logo and the company name.
 * Plain 2D canvas — light enough for phones; pauses off-screen; the pointer / a finger pushes the
 * particles aside and they spring back. With `prefers-reduced-motion` only the finished lettering is drawn.
 */
export function GranuleName({ lines, compactLines, logoSrc, anchorRef, className }: GranuleNameProps) {
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
    const pointer = { x: -9999, y: -9999, active: false };

    const start = performance.now();
    let raf = 0;
    let visible = true;
    let disposed = false;
    let resizeTimer = 0;

    let logo: HTMLImageElement | null = null;

    /** Samples the logo and the lettering into lists of points and (re)creates the particles. */
    function build() {
      const rect = el!.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      el!.width = Math.round(width * dpr);
      el!.height = Math.round(height * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);

      const small = width < 640;
      const rows = small && compactLines ? compactLines : lines;
      const anchor = anchorRef.current?.getBoundingClientRect();
      const area = anchor
        ? { cx: anchor.left - rect.left + anchor.width / 2, cy: anchor.top - rect.top + anchor.height / 2, w: anchor.width, h: anchor.height }
        : { cx: width / 2, cy: height / 2, w: width * 0.8, h: height * 0.5 };
      const top = area.cy - area.h / 2;

      // Vertical layout: the logo on top, then the name in as many lines as it has.
      const logoH = logo ? Math.min(area.h * 0.36, area.w * (small ? 0.66 : 0.42) * (logo.naturalHeight / logo.naturalWidth)) : 0;
      const logoW = logo ? logoH * (logo.naturalWidth / logo.naturalHeight) : 0;
      const gap = logo ? area.h * 0.07 : 0;
      const textTop = top + logoH + gap;
      const textH = area.h - logoH - gap;
      const weights = rows.map((_, i) => (i === 0 ? 1.1 : 1));
      const weightSum = weights.reduce((a, b) => a + b, 0);

      const readInk = (paint: (c: CanvasRenderingContext2D) => void) => {
        const off = document.createElement('canvas');
        off.width = Math.ceil(width);
        off.height = Math.ceil(height);
        const c = off.getContext('2d', { willReadFrequently: true })!;
        paint(c);
        return { data: c.getImageData(0, 0, off.width, off.height).data, w: off.width, h: off.height };
      };

      // ── the lettering
      let minFont = 999;
      const text = readInk((c) => {
        c.direction = isArabic ? 'rtl' : 'ltr';
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillStyle = '#fff';
        let y = textTop;
        rows.forEach((line, i) => {
          const lineH = (textH * weights[i]!) / weightSum;
          let size = Math.min(lineH * (i === 0 ? 0.78 : 0.9), 210);
          c.font = `${weight} ${size}px ${family}`;
          const measured = c.measureText(line).width;
          const maxWidth = area.w * 0.97;
          if (measured > maxWidth) {
            size *= maxWidth / measured;
            c.font = `${weight} ${size}px ${family}`;
          }
          minFont = Math.min(minFont, size);
          c.lineJoin = 'round';
          c.lineWidth = size * (isArabic ? 0.045 : 0.022);
          c.strokeStyle = '#fff';
          c.strokeText(line, area.cx, y + lineH / 2);
          c.fillText(line, area.cx, y + lineH / 2);
          y += lineH;
        });
      });
      const textInk: { x: number; y: number; line: number }[] = [];
      const step = 2;
      const lineBounds = weights.map((_, i) => textTop + (textH * weights.slice(0, i).reduce((a, b) => a + b, 0)) / weightSum);
      for (let y = 0; y < text.h; y += step) {
        for (let x = 0; x < text.w; x += step) {
          if ((text.data[(y * text.w + x) * 4 + 3] ?? 0) > 128) {
            let line = 0;
            lineBounds.forEach((b, i) => {
              if (y >= b) line = i;
            });
            textInk.push({ x, y, line });
          }
        }
      }

      // ── the logo (needs a same-origin image; skipped when the pixels cannot be read)
      const logoInk: { x: number; y: number; color: string }[] = [];
      if (logo) {
        try {
          const img = readInk((c) => c.drawImage(logo!, area.cx - logoW / 2, top, logoW, logoH));
          let n = 0;
          for (let y = 0; y < img.h; y += step) {
            for (let x = 0; x < img.w; x += step) {
              const k = (y * img.w + x) * 4;
              const r = img.data[k]!;
              const g = img.data[k + 1]!;
              const b = img.data[k + 2]!;
              const a = img.data[k + 3]!;
              if (a > 128 && !(r > 232 && g > 232 && b > 232)) {
                n += 1;
                logoInk.push({ x, y, color: logoColor(r, g, b, n) });
              }
            }
          }
        } catch {
          /* tainted canvas: fall back to the lettering only */
        }
      }

      const budget = small ? 3800 : 9500;
      const shuffle = <T,>(list: T[]) => {
        for (let i = list.length - 1; i > 0; i -= 1) {
          const j = Math.floor(Math.random() * (i + 1));
          [list[i], list[j]] = [list[j]!, list[i]!];
        }
        return list;
      };
      const logoShare = logoInk.length ? 0.34 : 0;
      const textBudget = Math.round(budget * (1 - logoShare));
      const perLine = rows.map((_, i) => shuffle(textInk.filter((point) => point.line === i)));
      // the first (largest) line is thinned to what is left; the smaller lines keep every point so they stay solid
      const restCount = perLine.slice(1).reduce((n, list) => n + list.length, 0);
      const firstQuota = Math.max(Math.round(textBudget * 0.45), textBudget - restCount);
      const textTargets = [...(perLine[0] ?? []).slice(0, firstQuota), ...perLine.slice(1).flat()];
      const logoTargets = shuffle(logoInk).slice(0, Math.round(budget * logoShare));
      const scale = Math.min(1.3, Math.max(0.6, minFont / 52));

      const left = area.cx - area.w / 2;
      const alongOf = (tx: number) => clamp01(isArabic ? (area.cx + area.w / 2 - tx) / area.w : (tx - left) / area.w);
      const logoLeft = area.cx - logoW / 2;
      const logoAlong = (tx: number) => clamp01(isArabic ? (logoLeft + logoW - tx) / logoW : (tx - logoLeft) / logoW);

      // the logo assembles first, then the name line by line, in the reading direction
      particles = logoTargets.map(({ x, y, color }) => ({
        sx: Math.random() * width,
        sy: Math.random() * height,
        vx: (Math.random() - 0.5) * 34,
        vy: (Math.random() - 0.5) * 34,
        tx: x,
        ty: y,
        delay: 0.3 + logoAlong(x) * 1.3 + Math.random() * 0.6,
        duration: 1.3 + Math.random() * 1.1,
        size: (1.05 + Math.random() * 0.75) * scale,
        color,
        pigment: true,
        seed: Math.random() * 100,
        ox: 0,
        oy: 0,
      }));

      textTargets.forEach(({ x, y, line }, i) => {
        // 40% pigments on the first line; the smaller lines are mostly pale pellets so they stay legible
        const pigment = line === 0 ? i % 5 < 2 : i % 5 === 0;
        const bold = line === 0 ? 1 : 1.18;
        particles.push({
          sx: Math.random() * width,
          sy: Math.random() * height,
          vx: (Math.random() - 0.5) * 34,
          vy: (Math.random() - 0.5) * 34,
          tx: x,
          ty: y,
          delay: (logoTargets.length ? 1.3 : 0.4) + line * 0.45 + alongOf(x) * 1.5 + Math.random() * 0.6,
          duration: 1.3 + Math.random() * 1.1,
          size: (pigment ? 1.0 + Math.random() * 0.8 : 1.25 + Math.random() * 0.85) * scale * bold,
          color: pigment ? PIGMENTS[i % PIGMENTS.length]! : PELLETS[i % PELLETS.length]!,
          pigment,
          seed: Math.random() * 100,
          ox: 0,
          oy: 0,
        });
      });

      // Background granules that keep floating and never settle.
      const ambient = Math.round(budget * 0.18);
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
            alpha = 0.22;
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
    const fontReady = Promise.race([
      document.fonts.load(`${weight} 100px ${family}`, lines.join(' ')).catch(() => undefined),
      new Promise((resolve) => window.setTimeout(resolve, 1500)),
    ]);
    const logoReady = logoSrc
      ? new Promise<void>((resolve) => {
          const image = new Image();
          image.onload = () => {
            logo = image;
            resolve();
          };
          image.onerror = () => resolve();
          image.src = logoSrc;
          window.setTimeout(resolve, 2500);
        })
      : Promise.resolve();
    void Promise.all([fontReady, logoReady]).then(() => {
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
  }, [lines, compactLines, logoSrc, anchorRef, reduced, locale]);

  return <canvas ref={canvas} aria-hidden className={className ?? 'absolute inset-0 size-full'} />;
}
