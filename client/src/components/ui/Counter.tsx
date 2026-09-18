import { useRef } from 'react';
import { gsap, ScrollTrigger, useGSAP } from '@/lib/gsap';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';

interface CounterProps {
  value: number;
  suffix?: string;
  className?: string;
}

const format = new Intl.NumberFormat('en');

/** Counts up from 0 to `value` once when scrolled into view. */
export function Counter({ value, suffix = '', className }: CounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduced = usePrefersReducedMotion();

  useGSAP(
    () => {
      const el = ref.current;
      if (!el || reduced) return;
      const state = { n: 0 };
      el.textContent = '0';
      const tween = gsap.to(state, {
        n: value,
        duration: 1.8,
        ease: 'power2.out',
        paused: true,
        onUpdate: () => {
          el.textContent = format.format(Math.round(state.n));
        },
      });
      ScrollTrigger.create({ trigger: el, start: 'top 90%', once: true, onEnter: () => tween.play() });
    },
    { dependencies: [value, reduced], scope: ref },
  );

  return (
    <span dir="ltr" className={className}>
      <span ref={ref}>{format.format(value)}</span>
      {suffix}
    </span>
  );
}
