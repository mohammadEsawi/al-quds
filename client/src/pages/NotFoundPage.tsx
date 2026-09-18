import { ButtonLink } from '@/components/ui/Button';
import { useSeo } from '@/hooks/useSeo';
import { useI18n } from '@/i18n/I18nProvider';

export default function NotFoundPage() {
  const { t } = useI18n();
  useSeo({ title: t.notFound.title, noindex: true });

  return (
    <section className="flex min-h-[80vh] flex-col items-center justify-center gap-5 px-6 pt-28 text-center">
      <p dir="ltr" className="font-display text-8xl font-bold text-gray-100">
        404
      </p>
      <h1 className="font-display text-3xl font-bold">{t.notFound.title}</h1>
      <p className="max-w-md text-gray-600">{t.notFound.text}</p>
      <ButtonLink to="/" arrow className="mt-2">
        {t.common.backToHome}
      </ButtonLink>
    </section>
  );
}
