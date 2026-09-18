import { useRef, type CSSProperties } from 'react';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { useI18n } from '@/i18n/I18nProvider';
import { gsap, ScrollTrigger, useGSAP } from '@/lib/gsap';

interface Step {
  title: string;
  text: string;
}

/**
 * Manufacturing stages. While scrolling, a line connects the stages and each stage lights up when
 * it reaches the reading position (ScrollTrigger). Horizontal on desktop, vertical on mobile.
 */
export function ProcessSteps({ steps }: { steps: Step[] }) {
  const { t } = useI18n();
  const root = useRef<HTMLOListElement>(null);
  const reduced = usePrefersReducedMotion();

  useGSAP(
    () => {
      const q = gsap.utils.selector(root);
      const items = q('[data-step]');

      if (reduced) {
        items.forEach((el) => el.setAttribute('data-active', 'true'));
        gsap.set(q('[data-fill]'), { scale: 1 });
        return;
      }

      q('[data-fill]').forEach((fill) => {
        const vertical = fill.hasAttribute('data-vertical');
        gsap.fromTo(
          fill,
          vertical ? { scaleY: 0 } : { scaleX: 0 },
          {
            ...(vertical ? { scaleY: 1 } : { scaleX: 1 }),
            ease: 'none',
            scrollTrigger: { trigger: root.current, start: 'top 70%', end: 'bottom 60%', scrub: 0.4 },
          },
        );
      });

      items.forEach((item) => {
        ScrollTrigger.create({
          trigger: item,
          start: 'top 68%',
          onEnter: () => item.setAttribute('data-active', 'true'),
          onLeaveBack: () => item.setAttribute('data-active', 'false'),
        });
      });
    },
    { scope: root, dependencies: [reduced, steps.length] },
  );

  return (
    <ol
      ref={root}
      style={{ '--n': steps.length } as CSSProperties}
      className="relative grid gap-10 lg:grid-cols-[repeat(var(--n),minmax(0,1fr))] lg:gap-6"
    >
      {/* vertical rail (mobile) */}
      <li aria-hidden className="absolute inset-y-2 start-6 w-0.5 bg-gray-200 lg:hidden">
        <div data-fill data-vertical className="h-full origin-top bg-primary" />
      </li>
      {/* horizontal rail (desktop): runs from the first circle's centre to the last one's */}
      <li
        aria-hidden
        className="absolute top-6 hidden h-0.5 bg-gray-200 lg:block lg:start-[calc(50%/var(--n))] lg:end-[calc(50%/var(--n))]"
      >
        <div data-fill className="h-full origin-right bg-primary ltr:origin-left" />
      </li>

      {steps.map((step, index) => (
        <li
          key={step.title}
          data-step
          data-active="false"
          className="group relative ps-16 lg:ps-0 lg:text-center"
        >
          <span className="absolute start-0 top-0 flex size-12 items-center justify-center rounded-full border-2 border-gray-200 bg-white font-display text-sm font-bold text-gray-400 transition-all duration-500 group-data-[active=true]:scale-110 group-data-[active=true]:border-primary group-data-[active=true]:bg-primary group-data-[active=true]:text-white group-data-[active=true]:shadow-primary lg:static lg:mx-auto lg:mb-5">
            <span dir="ltr">{String(index + 1).padStart(2, '0')}</span>
          </span>
          <p className="text-overline mb-1 text-gray-400 transition-colors group-data-[active=true]:text-primary">
            {t.process.step} {index + 1}
          </p>
          <h3 className="font-display text-lg font-semibold text-gray-500 transition-colors group-data-[active=true]:text-gray-900">
            {step.title}
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-gray-400 transition-colors group-data-[active=true]:text-gray-600">
            {step.text}
          </p>
        </li>
      ))}
    </ol>
  );
}
