import { useRef, useState } from 'react';
import { ButtonLink } from '@/components/ui/Button';
import { Counter } from '@/components/ui/Counter';
import { useSiteData } from '@/context/SiteData';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { useI18n } from '@/i18n/I18nProvider';
import { gsap, useGSAP } from '@/lib/gsap';
import { BOTTLE, BottleScene } from './BottleScene';
import { spinWheels, Truck, wheelDegrees } from './Truck';
import { CheckCircle2, ShieldCheck } from 'lucide-react';

const SEEN_KEY = 'lamico:intro-seen';
const PHOTO = '/assets/water/water-1-5l.webp';

function readSeen(): boolean {
  try {
    return sessionStorage.getItem(SEEN_KEY) === '1';
  } catch {
    return false;
  }
}

function markSeen() {
  try {
    sessionStorage.setItem(SEEN_KEY, '1');
  } catch {
    /* storage unavailable — the intro simply replays next time */
  }
}

/**
 * Homepage hero. A short cinematic intro (≈8 s, ≈3.5 s for returning visitors):
 * the Al-Quds truck drives in, stops and leaves; water pours into a bottle; the bottle fills and
 * gives way to the real product photo while the headline appears.
 * With `prefers-reduced-motion` the final, static hero is shown immediately.
 */
export function HeroIntro() {
  const { t, pick } = useI18n();
  const { company, home } = useSiteData();
  const hero = home.hero ?? {};
  const text = (key: 'overline' | 'title' | 'subtitle' | 'ctaSectors' | 'ctaContact', fallback: string) => {
    const override = hero[key];
    return override && override.ar && override.en ? pick(override) : fallback;
  };
  const reduced = usePrefersReducedMotion();
  const root = useRef<HTMLElement>(null);
  const timeline = useRef<gsap.core.Timeline | null>(null);
  const [playing, setPlaying] = useState(!reduced);

  const stat = (key: 'years' | 'cities' | 'bottles' | 'team') => company.stats.find((s) => s.key === key);

  useGSAP(
    () => {
      const q = gsap.utils.selector(root);
      const all = (k: string) => q(`[data-h="${k}"]`);
      const one = (k: string) => all(k)[0] as HTMLElement;

      const showFinalState = () => {
        gsap.set(all('sky-final'), { opacity: 1 });
        gsap.set(all('stage'), { autoAlpha: 0 });
        gsap.set([...all('text-item'), ...all('badge')], { opacity: 1, y: 0 });
        gsap.set(one('card'), { opacity: 1, scale: 1, y: 0 });
        gsap.set(one('visual'), { x: 0 });
        gsap.set(one('photo'), { opacity: 1 });
        gsap.set(all('bottle'), { autoAlpha: 0 });
        gsap.set(all('skip'), { autoAlpha: 0 });
      };

      if (reduced) {
        showFinalState();
        setPlaying(false);
        return;
      }

      // ── initial hidden states ──
      const truckWrap = one('truck');
      const truckBody = one('truck-body');
      const wheelsHost = truckBody;
      const vw = window.innerWidth;
      const truckWidth = truckWrap.offsetWidth;
      const offscreen = vw / 2 + truckWidth / 2 + 80;

      gsap.set(all('text-item'), { opacity: 0, y: 26 });
      gsap.set(all('badge'), { opacity: 0, y: 14 });
      gsap.set(one('card'), { opacity: 0, scale: 0.9, y: 28 });
      // While the bottle fills, the card sits in the middle of the screen; it slides to its slot later.
      const visualBox = one('visual').getBoundingClientRect();
      const centreShift = vw / 2 - (visualBox.left + visualBox.width / 2);
      gsap.set(one('visual'), { x: centreShift });
      gsap.set(one('photo'), { opacity: 0 });
      gsap.set(all('sky-final'), { opacity: 0 });
      gsap.set(one('kicker'), { opacity: 0 });
      gsap.set(truckWrap, { xPercent: -50, x: -offscreen });
      gsap.set(one('water'), { y: BOTTLE.emptyOffset });
      gsap.set(one('cap'), { y: -260, opacity: 0 });
      gsap.set(one('stream'), { scaleY: 0 });

      // ── continuous ambience (cleaned up automatically) ──
      all('cloud').forEach((cloud, i) => {
        gsap.to(cloud, { x: i % 2 ? -70 : 70, duration: 18 + i * 5, ease: 'sine.inOut', yoyo: true, repeat: -1 });
      });
      gsap.to(all('wave-back'), { x: -100, duration: 1.7, ease: 'none', repeat: -1 });
      gsap.to(all('wave-front'), { x: 100, duration: 1.3, ease: 'none', repeat: -1 });

      const bob = gsap.to(truckBody, {
        y: -1.6,
        duration: 0.11,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1,
        paused: true,
      });
      const drops = gsap.timeline({ repeat: -1, paused: true });
      all('drop').forEach((drop, i) => {
        drops.fromTo(
          drop,
          { y: 0, opacity: 0.9 },
          { y: -110 - i * 24, x: (i - 1.5) * 44, opacity: 0, duration: 0.45, ease: 'power1.out' },
          i * 0.09,
        );
      });

      const spin = () => {
        const x = gsap.getProperty(truckWrap, 'x') as number;
        spinWheels(wheelsHost, wheelDegrees(x, truckWidth));
      };

      const finish = () => {
        markSeen();
        bob.kill();
        drops.kill();
        gsap.set(all('stage'), { autoAlpha: 0 });
        gsap.set(all('skip'), { autoAlpha: 0 });
        setPlaying(false);
      };

      // ── the story ──
      // The truck drives gently: long, soft-easing legs so it never looks rushed.
      const ENTER = 3.4;
      const HOLD = 0.4;
      const EXIT = 2.8;
      const leave = ENTER + HOLD;

      const tl = gsap.timeline({ defaults: { ease: 'power2.out' }, onComplete: finish });
      timeline.current = tl;

      tl.to(one('kicker'), { opacity: 1, duration: 0.8 }, 0.3)
        .add(() => void bob.play(), 0)
        .to(truckWrap, { x: 0, duration: ENTER, ease: 'power2.out', onUpdate: spin }, 0)
        .add(() => {
          bob.pause();
          gsap.to(truckBody, { y: 0, duration: 0.2 });
        }, ENTER - 0.1)
        .to(
          truckBody,
          { rotation: 0.4, transformOrigin: '92% 100%', duration: 0.22, yoyo: true, repeat: 1, ease: 'sine.inOut' },
          ENTER - 0.1,
        )
        .add(() => void bob.play(), leave)
        .to(truckWrap, { x: offscreen, duration: EXIT, ease: 'power2.in', onUpdate: spin }, leave)
        .add(() => {
          bob.pause();
        }, leave + EXIT)
        .to(one('kicker'), { opacity: 0, y: -10, duration: 0.5 }, leave + 0.2)
        .to(all('sky-final'), { opacity: 1, duration: 1.8, ease: 'power1.inOut' }, leave + 0.5)
        .to([...all('hills'), ...all('road'), ...all('cloud')], { opacity: 0, duration: 1.2 }, leave + 1.7)
        // the bottle scene appears while the truck is still leaving
        .to(one('card'), { opacity: 1, scale: 1, y: 0, duration: 0.9, ease: 'power3.out' }, leave + 1.0)
        .to(one('stream'), { scaleY: 1, transformOrigin: '50% 0%', duration: 0.5, ease: 'power1.in' }, leave + 1.6)
        .add(() => void drops.play(), leave + 2.0)
        .to(one('water'), { y: 0, duration: 1.9, ease: 'power1.inOut' }, leave + 2.0)
        .to(one('stream'), { scaleY: 0, transformOrigin: '50% 100%', duration: 0.4, ease: 'power1.out' }, leave + 3.8)
        .add(() => {
          drops.pause();
          gsap.set(all('drop'), { opacity: 0 });
        }, leave + 3.85)
        .to(one('water'), { opacity: 0, duration: 0.9, ease: 'power1.inOut' }, leave + 4.0)
        .fromTo(one('cap'), { y: -260, opacity: 0 }, { y: 0, opacity: 1, duration: 0.55, ease: 'bounce.out' }, leave + 3.95)
        // hand over to the real product photo (identical composition) and reveal the headline
        .to(one('visual'), { x: 0, duration: 1.1, ease: 'power3.inOut' }, leave + 4.6)
        .to(one('photo'), { opacity: 1, duration: 0.7, ease: 'power1.inOut' }, leave + 4.8)
        .to(one('bottle'), { opacity: 0, duration: 0.3 }, leave + 5.5)
        .to(all('text-item'), { opacity: 1, y: 0, duration: 0.7, stagger: 0.1 }, leave + 4.9)
        .to(all('badge'), { opacity: 1, y: 0, duration: 0.6, stagger: 0.15 }, leave + 5.5)
        .to(all('skip'), { opacity: 0, duration: 0.3 }, leave + 5.5);

      // Returning visitors get a faster version.
      if (readSeen()) tl.timeScale(2.2);

      // Dev only: `?introAt=4.5` freezes the intro at that second (used for visual checks).
      const frozenAt = import.meta.env.DEV ? new URLSearchParams(window.location.search).get('introAt') : null;
      if (frozenAt !== null) {
        tl.pause(Number(frozenAt));
      } else if (document.getElementById('splash') && !document.getElementById('splash')?.classList.contains('is-done')) {
        // The first-load splash is still covering the page: start the drive-by as it fades away, not behind it.
        tl.pause(0);
        const play = () => tl.play();
        window.addEventListener('lamico:splash-done', play, { once: true });
        return () => window.removeEventListener('lamico:splash-done', play);
      }
    },
    { scope: root, dependencies: [reduced] },
  );

  const skip = () => {
    timeline.current?.progress(1, false);
  };

  const trust = [
    { data: stat('years'), label: t.hero.trustYears },
    { data: stat('cities'), label: t.hero.trustCities },
    { data: stat('bottles'), label: t.hero.trustBottles },
    { data: stat('team'), label: t.hero.trustTeam },
  ];

  return (
    <section ref={root} id="hero" className="relative isolate min-h-[100dvh] overflow-hidden">
      {/* sky: blue during the drive-by, light for the final hero */}
      <div
        aria-hidden
        className="absolute inset-0 -z-30 bg-[linear-gradient(180deg,#429ae0_0%,#7dbdf2_42%,#bfe0fa_74%,#e6f3fd_100%)]"
      />
      <div
        data-h="sky-final"
        aria-hidden
        className="absolute inset-0 -z-20 bg-[linear-gradient(180deg,#fbfdff_0%,#eaf4fd_55%,#d4e7f8_100%)]"
      />

      {/* drive-by scene (first viewport only) */}
      <div data-h="stage" aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[100dvh]">
        {[
          'top-[12%] start-[6%] w-[38vw] h-24',
          'top-[24%] end-[4%] w-[46vw] h-28',
          'top-[8%] start-[44%] w-[24vw] h-16',
        ].map((pos) => (
          <div key={pos} data-h="cloud" className={`absolute rounded-full bg-white/70 blur-2xl ${pos}`} />
        ))}

        <svg
          data-h="hills"
          viewBox="0 0 1000 140"
          preserveAspectRatio="none"
          className="absolute inset-x-0 bottom-[26%] h-[20%] w-full"
        >
          <path
            d="M0 140 V78 C90 30 170 74 270 48 S430 8 530 52 S710 96 800 50 S940 26 1000 66 V140Z"
            fill="#a9c9e8"
          />
          <path
            d="M0 140 V104 C110 70 190 110 300 90 S470 60 580 96 S760 118 860 84 S960 74 1000 96 V140Z"
            fill="#8fb7de"
          />
        </svg>

        <div
          data-h="road"
          className="absolute inset-x-0 bottom-0 h-[26%] bg-linear-to-b from-[#cdd6de] to-[#a7b3be]"
        >
          <div className="absolute inset-x-0 top-0 h-0.5 bg-white/70" />
          <div className="absolute inset-x-0 top-[46%] h-1.5 bg-[repeating-linear-gradient(90deg,#fff_0_72px,transparent_72px_160px)] opacity-80" />
        </div>

        <div
          data-h="truck"
          className="absolute left-1/2 bottom-[13%] w-[114vw] sm:w-[118vw] lg:w-[min(1500px,96vw)]"
        >
          <div
            aria-hidden
            className="absolute inset-x-[4%] -bottom-2 h-5 rounded-[50%] bg-gray-900/35 blur-lg"
          />
          <div data-h="truck-body">
            <Truck eager alt="" />
          </div>
        </div>

        <div
          data-h="kicker"
          className="absolute inset-x-0 top-[16%] px-6 text-center text-white drop-shadow-[0_2px_12px_rgba(1,53,98,0.35)]"
        >
          <p className="font-display text-3xl font-bold sm:text-5xl">{t.brand.name}</p>
          <p className="mt-2 text-base sm:text-xl">{t.hero.kicker}</p>
        </div>
      </div>

      {/* final hero layout */}
      <div className="container-x relative z-10 grid min-h-[100dvh] items-center gap-10 pt-28 pb-14 lg:grid-cols-2 lg:gap-16">
        <div className="mx-auto max-w-xl text-center max-lg:order-2 lg:mx-0 lg:text-start">
          <span
            data-h="text-item"
            className="text-overline mb-6 inline-flex items-center gap-2 rounded-full bg-primary/8 px-4 py-2 text-primary"
          >
            <span className="size-1.5 animate-pulse rounded-full bg-primary" />
            {text('overline', t.hero.overline)}
          </span>

          <h1
            data-h="text-item"
            className="font-display text-4xl leading-tight font-bold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl"
          >
            {text('title', t.hero.title)}
          </h1>

          <p data-h="text-item" className="mt-6 text-lg leading-relaxed font-light text-gray-600 sm:text-xl">
            {text('subtitle', t.hero.subtitle)}
          </p>

          <div data-h="text-item" className="mt-9 flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
            <ButtonLink to="/sectors" size="lg" arrow>
              {text('ctaSectors', t.hero.ctaSectors)}
            </ButtonLink>
            <ButtonLink to="/contact" size="lg" variant="secondary">
              {text('ctaContact', t.hero.ctaContact)}
            </ButtonLink>
          </div>

          <dl
            data-h="text-item"
            className="mt-10 grid grid-cols-2 gap-y-6 border-t border-gray-200 pt-7 text-center sm:flex sm:flex-wrap sm:justify-center sm:gap-x-7 sm:gap-y-5 sm:text-start lg:justify-start"
          >
            {trust.map(({ data, label }) =>
              data ? (
                <div key={data.key}>
                  <dt className="sr-only">{label}</dt>
                  <dd className="text-2xl font-bold text-gray-900">
                    <Counter value={data.value} suffix={data.suffix} />
                  </dd>
                  <span aria-hidden className="text-xs tracking-wide text-gray-400">
                    {label}
                  </span>
                </div>
              ) : null,
            )}
          </dl>
        </div>

        <div data-h="visual" className="relative mx-auto w-full max-w-[520px] max-lg:order-1">
          <div
            data-h="card"
            className="relative aspect-square overflow-hidden rounded-[2rem] bg-linear-to-b from-[#dbeafb] to-[#b9d6f2] shadow-deep"
          >
            <BottleScene />
            <img
              data-h="photo"
              src={PHOTO}
              alt={t.hero.productAlt}
              width={1400}
              height={1398}
              decoding="async"
              className="absolute inset-0 size-full object-cover"
            />
          </div>

          <div
            data-h="badge"
            className="absolute -top-4 right-2 flex items-center gap-2 rounded-xl bg-white px-4 py-3 shadow-lift sm:-right-6"
          >
            <CheckCircle2 aria-hidden className="size-5 text-success" />
            <span className="text-xs font-semibold text-gray-900">{t.hero.badgeIso}</span>
          </div>
          <div
            data-h="badge"
            className="absolute -bottom-4 left-2 flex items-center gap-2 rounded-xl bg-white px-4 py-3 shadow-lift sm:-left-6"
          >
            <ShieldCheck aria-hidden className="size-5 text-primary-light" />
            <span className="text-xs font-semibold text-gray-900">{t.hero.badgeNatural}</span>
          </div>
        </div>
      </div>

      {playing && (
        <button
          data-h="skip"
          type="button"
          onClick={skip}
          className="absolute end-5 bottom-5 z-20 rounded-full border border-white/50 bg-gray-900/40 px-4 py-2 text-xs font-semibold text-white backdrop-blur transition hover:bg-gray-900/60"
        >
          {t.hero.skipIntro}
        </button>
      )}
    </section>
  );
}
