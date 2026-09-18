import { useRef } from 'react';
import { Truck, spinWheels, wheelDegrees } from '@/components/hero/Truck';
import { SectionHeader } from '@/components/ui/Section';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { useI18n } from '@/i18n/I18nProvider';
import { gsap, useGSAP } from '@/lib/gsap';

interface DistributionTruckProps {
  overline: string;
  title: string;
  text: string;
}

/**
 * The distribution truck driving through the page: it rolls sideways as the visitor scrolls,
 * its wheels turn with the distance travelled and the road markings slide the opposite way.
 */
export function DistributionTruck({ overline, title, text }: DistributionTruckProps) {
  const { t } = useI18n();
  const root = useRef<HTMLElement>(null);
  const reduced = usePrefersReducedMotion();

  useGSAP(
    () => {
      const q = gsap.utils.selector(root);
      const wrap = q('[data-truck]')[0] as HTMLElement | undefined;
      const lines = q('[data-lines]')[0] as HTMLElement | undefined;
      if (reduced || !wrap || !lines) return;

      const travel = Math.min(window.innerWidth * 0.16, 260);
      const width = wrap.offsetWidth;
      gsap.set(wrap, { x: -travel });

      gsap.to(wrap, {
        x: travel,
        ease: 'none',
        scrollTrigger: { trigger: root.current, start: 'top bottom', end: 'bottom top', scrub: 0.5 },
        onUpdate: () => {
          const x = gsap.getProperty(wrap, 'x') as number;
          spinWheels(wrap, wheelDegrees(x, width));
          lines.style.backgroundPositionX = `${-x * 1.4}px`;
        },
      });
    },
    { scope: root, dependencies: [reduced] },
  );

  return (
    <section
      ref={root}
      className="relative overflow-hidden bg-linear-to-b from-[#7dbdf2] via-[#bfe0fa] to-[#eaf5fe] pt-16 sm:pt-24"
    >
      <div className="container-x">
        <SectionHeader overline={overline} title={title} text={text} />
      </div>

      <div className="relative pb-10 sm:pb-14">
        <div data-truck className="relative mx-auto w-[128vw] max-w-none sm:w-[96vw] lg:w-[min(1300px,92vw)]">
          <div
            aria-hidden
            className="absolute inset-x-[4%] -bottom-2 h-5 rounded-[50%] bg-gray-900/35 blur-lg"
          />
          <Truck alt={t.water.truckAlt} />
        </div>

        {/* road */}
        <div aria-hidden className="absolute inset-x-0 bottom-0 -z-10 h-24 bg-linear-to-b from-[#cdd6de] to-[#a7b3be] sm:h-28">
          <div className="absolute inset-x-0 top-0 h-0.5 bg-white/70" />
          <div
            data-lines
            className="absolute inset-x-0 top-[52%] h-1.5 bg-[repeating-linear-gradient(90deg,#fff_0_72px,transparent_72px_160px)] opacity-80"
          />
        </div>
      </div>
    </section>
  );
}
