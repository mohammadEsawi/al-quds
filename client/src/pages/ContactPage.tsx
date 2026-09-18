import { Clock, Mail, MapPin, Phone } from 'lucide-react';
import { FacebookIcon, InstagramIcon, LinkedinIcon } from '@/components/ui/BrandIcons';
import { PageHero } from '@/components/ui/PageHero';
import { Reveal } from '@/components/ui/Reveal';
import { Section } from '@/components/ui/Section';
import { ContactForm } from '@/components/sections/ContactForm';
import { useSiteData } from '@/context/SiteData';
import { useSeo } from '@/hooks/useSeo';
import { useI18n } from '@/i18n/I18nProvider';

export default function ContactPage() {
  const { t, pick } = useI18n();
  const { company } = useSiteData();
  useSeo({ title: t.nav.contact, description: t.contact.metaDescription });

  const items = [
    { icon: MapPin, label: t.contact.address, value: pick(company.address) },
    { icon: Phone, label: t.contact.phone, value: company.phoneDisplay, href: `tel:${company.phone}`, ltr: true },
    { icon: Mail, label: t.contact.email, value: company.email, href: `mailto:${company.email}`, ltr: true },
    { icon: Clock, label: t.contact.hours, value: pick(company.hours) },
  ];

  const socials = [
    { href: company.social.facebook, label: 'Facebook', Icon: FacebookIcon },
    { href: company.social.instagram, label: 'Instagram', Icon: InstagramIcon },
    { href: company.social.linkedin, label: 'LinkedIn', Icon: LinkedinIcon },
  ].filter((s) => s.href);

  return (
    <>
      <PageHero title={t.contact.heroTitle} text={t.contact.heroText} current={t.nav.contact} />

      <Section>
        <div className="grid items-start gap-10 lg:grid-cols-[1fr_1.2fr] lg:gap-16">
          <Reveal
            direction="right"
            className="relative overflow-hidden rounded-3xl bg-linear-to-br from-primary to-primary-light p-8 text-white sm:p-10"
          >
            <div aria-hidden className="absolute -end-12 -bottom-12 size-52 rounded-full bg-white/5" />
            <h2 className="font-display text-3xl font-bold">{t.contact.infoTitle}</h2>
            <p className="mt-3 mb-10 leading-relaxed text-white/85">{t.contact.infoText}</p>

            <ul className="relative space-y-6">
              {items.map(({ icon: Icon, label, value, href, ltr }) => (
                <li key={label} className="flex items-start gap-4">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-white/12">
                    <Icon aria-hidden className="size-5" />
                  </span>
                  <div>
                    <span className="text-overline block text-white/70">{label}</span>
                    {href ? (
                      <a href={href} dir={ltr ? 'ltr' : undefined} className="font-medium hover:underline">
                        {value}
                      </a>
                    ) : (
                      <span className="font-medium">{value}</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>

            {socials.length > 0 && (
              <div className="relative mt-10 border-t border-white/15 pt-6">
                <p className="text-overline mb-3 text-white/70">{t.contact.social}</p>
                <ul className="flex gap-3">
                  {socials.map(({ href, label, Icon }) => (
                    <li key={label}>
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={label}
                        className="flex size-10 items-center justify-center rounded-lg bg-white/10 transition hover:-translate-y-0.5 hover:bg-white/25"
                      >
                        <Icon aria-hidden className="size-[18px]" />
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Reveal>

          <Reveal direction="left" className="rounded-3xl bg-white p-6 shadow-lift sm:p-10">
            <h3 className="font-display text-2xl font-semibold">{t.contact.formTitle}</h3>
            <p className="mt-2 mb-8 text-sm text-gray-600">{t.contact.formText}</p>
            <ContactForm />
          </Reveal>
        </div>
      </Section>

      <section className="pb-16 sm:pb-24">
        <div className="container-x">
          <Reveal className="h-96 overflow-hidden rounded-3xl bg-gray-100 shadow-lift">
            <iframe
              title={t.contact.map}
              src={company.mapEmbedUrl}
              loading="lazy"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
              className="size-full border-0"
            />
          </Reveal>
        </div>
      </section>
    </>
  );
}
