import { Mail, MapPin, Phone } from 'lucide-react';
import { FacebookIcon, InstagramIcon, LinkedinIcon } from '@/components/ui/BrandIcons';
import { useSiteData } from '@/context/SiteData';
import { useI18n } from '@/i18n/I18nProvider';
import { LocalizedLink } from '@/i18n/LocalizedLink';

export function Footer() {
  const { t, pick } = useI18n();
  const { company, sectors } = useSiteData();

  const companyLinks = [
    { to: '/about', label: t.nav.about },
    { to: '/products', label: t.nav.products },
    { to: '/real-estate', label: t.nav.realEstate },
    { to: '/careers', label: t.nav.careers },
    { to: '/contact', label: t.nav.contact },
  ];

  const socials = [
    { href: company.social.facebook, label: 'Facebook', Icon: FacebookIcon },
    { href: company.social.instagram, label: 'Instagram', Icon: InstagramIcon },
    { href: company.social.linkedin, label: 'LinkedIn', Icon: LinkedinIcon },
  ].filter((s) => s.href);

  return (
    <footer className="bg-linear-to-br from-gray-900 to-gray-800 pt-20 text-gray-300">
      <div className="container-x">
        <div className="grid gap-12 border-b border-white/10 pb-16 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1.2fr]">
          <div className="max-w-sm sm:col-span-2 lg:col-span-1">
            <span className="mb-6 inline-block rounded-xl bg-white/95 px-3 py-1.5">
              <img src={company.logo} alt={t.brand.logoAlt} className="h-10 w-auto" loading="lazy" />
            </span>
            <p className="text-sm leading-relaxed">{t.brand.footerText}</p>
            {socials.length > 0 && (
              <ul className="mt-6 flex gap-3">
                {socials.map(({ href, label, Icon }) => (
                  <li key={label}>
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={label}
                      className="flex size-10 items-center justify-center rounded-lg bg-white/5 text-gray-400 transition hover:-translate-y-0.5 hover:bg-primary hover:text-white"
                    >
                      <Icon aria-hidden className="size-4" />
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <h3 className="text-overline mb-6 text-white">{t.footer.company}</h3>
            <ul className="space-y-3 text-sm">
              {companyLinks.map((l) => (
                <li key={l.to}>
                  <LocalizedLink to={l.to} className="text-gray-400 transition-all hover:ps-2 hover:text-white">
                    {l.label}
                  </LocalizedLink>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-overline mb-6 text-white">{t.footer.sectors}</h3>
            <ul className="space-y-3 text-sm">
              {sectors.map((s) => (
                <li key={s.key}>
                  <LocalizedLink to={s.path} className="text-gray-400 transition-all hover:ps-2 hover:text-white">
                    {pick(s.name)}
                  </LocalizedLink>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-overline mb-6 text-white">{t.footer.contact}</h3>
            <ul className="space-y-4 text-sm">
              <li className="flex items-start gap-3">
                <MapPin aria-hidden className="mt-0.5 size-[18px] shrink-0 text-secondary-light" />
                <span>{pick(company.address)}</span>
              </li>
              <li className="flex items-start gap-3">
                <Phone aria-hidden className="mt-0.5 size-[18px] shrink-0 text-secondary-light" />
                <a href={`tel:${company.phone}`} dir="ltr" className="hover:text-white">
                  {company.phoneDisplay}
                </a>
              </li>
              <li className="flex items-start gap-3">
                <Mail aria-hidden className="mt-0.5 size-[18px] shrink-0 text-secondary-light" />
                <a href={`mailto:${company.email}`} dir="ltr" className="hover:text-white">
                  {company.email}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-4 py-6 text-xs text-gray-500 sm:flex-row">
          <p>
            &copy; {new Date().getFullYear()} {pick(company.name)}. {t.footer.rights}
          </p>
          <div className="flex gap-6">
            <LocalizedLink to="/privacy" className="hover:text-gray-300">
              {t.footer.privacy}
            </LocalizedLink>
            <LocalizedLink to="/terms" className="hover:text-gray-300">
              {t.footer.terms}
            </LocalizedLink>
          </div>
        </div>
      </div>
    </footer>
  );
}
