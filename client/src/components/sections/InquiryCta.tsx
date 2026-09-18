import { ButtonAnchor, ButtonLink } from '@/components/ui/Button';
import { Reveal } from '@/components/ui/Reveal';
import { WhatsAppIcon } from '@/components/layout/WhatsAppFloat';
import { useI18n } from '@/i18n/I18nProvider';
import { whatsappLink } from '@/lib/whatsapp';

interface InquiryCtaProps {
  title: string;
  text: string;
  whatsappNumber: string;
  whatsappMessage: string;
}

/** "Ask us" block with a WhatsApp button (number and message come from settings) and a contact link. */
export function InquiryCta({ title, text, whatsappNumber, whatsappMessage }: InquiryCtaProps) {
  const { t } = useI18n();

  return (
    <Reveal direction="scale" className="mx-auto max-w-3xl rounded-3xl bg-linear-to-br from-primary to-primary-light p-8 text-center text-white shadow-primary sm:p-12">
      <h2 className="font-display text-2xl font-bold sm:text-4xl">{title}</h2>
      <p className="mx-auto mt-4 max-w-xl text-lg leading-relaxed text-white/85">{text}</p>
      <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
        <ButtonAnchor href={whatsappLink(whatsappNumber, whatsappMessage)} variant="whatsapp" size="lg">
          <WhatsAppIcon className="size-5" />
          {t.common.whatsapp}
        </ButtonAnchor>
        <ButtonLink to="/contact" variant="glass" size="lg" arrow>
          {t.common.contactUs}
        </ButtonLink>
      </div>
    </Reveal>
  );
}
