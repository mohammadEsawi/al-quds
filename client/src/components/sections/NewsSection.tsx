import { Reveal } from '@/components/ui/Reveal';
import { Section, SectionHeader } from '@/components/ui/Section';
import { useAsync } from '@/hooks/useAsync';
import { useI18n } from '@/i18n/I18nProvider';
import { cn } from '@/lib/cn';
import { getNews } from '@/services/content.service';

// A near-empty grid trails off to one side instead of sitting centered; constrain and center it instead.
const layoutByCount: Record<number, string> = {
  1: 'max-w-sm sm:grid-cols-1',
  2: 'max-w-3xl sm:grid-cols-2',
};

/** Homepage "latest news" cards — admin-managed, so this renders nothing until at least one exists. */
export function NewsSection() {
  const { t, pick, locale } = useI18n();
  const { data } = useAsync(getNews);

  if (!data?.length) return null;

  const dateFormat = new Intl.DateTimeFormat(locale === 'ar' ? 'ar-PS-u-nu-latn' : 'en-GB', { dateStyle: 'medium' });

  return (
    <Section id="news">
      <SectionHeader overline={t.home.newsOverline} title={t.home.newsTitle} />
      <ul className={cn('mx-auto grid max-w-5xl gap-8', layoutByCount[data.length] ?? 'sm:grid-cols-2 lg:grid-cols-3')}>
        {data.map((item, index) => {
          const body = (
            <>
              {item.image && (
                <div className="aspect-4/3 overflow-hidden rounded-t-2xl bg-gray-50">
                  <img src={item.image} alt="" loading="lazy" className="size-full object-cover transition-transform duration-500 group-hover:scale-105" />
                </div>
              )}
              <div className="p-5">
                <p className="text-xs text-gray-400">{dateFormat.format(new Date(item.publishedAt))}</p>
                <h3 className="mt-1 font-display text-lg font-semibold text-gray-900">{pick(item.title)}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">{pick(item.text)}</p>
              </div>
            </>
          );
          const className = 'group block h-full overflow-hidden rounded-2xl border border-gray-100 bg-white transition-all duration-300 hover:-translate-y-1 hover:border-transparent hover:shadow-lift';
          return (
            <Reveal as="li" key={item.id} delay={(index % 3) * 0.08}>
              {item.link ? (
                <a href={item.link} target={item.link.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer" className={className}>
                  {body}
                </a>
              ) : (
                <div className={className}>{body}</div>
              )}
            </Reveal>
          );
        })}
      </ul>
    </Section>
  );
}
