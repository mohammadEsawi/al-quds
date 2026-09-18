import { useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2, Send } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Button, ButtonAnchor } from '@/components/ui/Button';
import { Field, inputClass } from '@/components/ui/FormField';
import { useSiteData } from '@/context/SiteData';
import { useI18n } from '@/i18n/I18nProvider';
import { whatsappLink } from '@/lib/whatsapp';
import { contactSchema, type ContactValues } from '@/lib/schemas';
import { submitContact } from '@/services/forms.service';
import { WhatsAppIcon } from '@/components/layout/WhatsAppFloat';

export function ContactForm() {
  const { t, pick } = useI18n();
  const { company } = useSiteData();
  const schema = useMemo(() => contactSchema(t.forms.errors), [t]);
  const [status, setStatus] = useState<'idle' | 'sent' | 'error'>('idle');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '', phone: '', subject: '', message: '', website: '' },
  });

  const subjects = Object.values(t.contact.subjects);
  const channel = company.whatsapp.general;

  const onSubmit = handleSubmit(async ({ website, ...values }) => {
    if (website) return setStatus('sent'); // honeypot filled: silently drop
    try {
      await submitContact({ ...values, phone: values.phone || undefined, subject: values.subject || undefined });
      reset();
      setStatus('sent');
    } catch {
      setStatus('error');
    }
  });

  if (status === 'sent') {
    return (
      <div role="status" className="py-10 text-center">
        <CheckCircle2 aria-hidden className="mx-auto mb-4 size-16 text-success" />
        <h3 className="font-display text-2xl font-semibold">{t.contact.successTitle}</h3>
        <p className="mt-2 text-gray-600">{t.contact.successText}</p>
      </div>
    );
  }

  return (
    <>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
        {/* honeypot */}
        <input type="text" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" {...register('website')} />

        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="contact-name" label={t.forms.fullName} required error={errors.name?.message}>
            <input
              id="contact-name"
              autoComplete="name"
              placeholder={t.forms.placeholders.fullName}
              aria-invalid={!!errors.name}
              aria-describedby="contact-name-msg"
              className={inputClass}
              {...register('name')}
            />
          </Field>
          <Field id="contact-email" label={t.forms.email} required error={errors.email?.message}>
            <input
              id="contact-email"
              type="email"
              dir="ltr"
              autoComplete="email"
              placeholder={t.forms.placeholders.email}
              aria-invalid={!!errors.email}
              aria-describedby="contact-email-msg"
              className={inputClass}
              {...register('email')}
            />
          </Field>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="contact-phone" label={t.forms.phone} error={errors.phone?.message}>
            <input
              id="contact-phone"
              type="tel"
              dir="ltr"
              autoComplete="tel"
              placeholder={t.forms.placeholders.phone}
              aria-invalid={!!errors.phone}
              aria-describedby="contact-phone-msg"
              className={inputClass}
              {...register('phone')}
            />
          </Field>
          <Field id="contact-subject" label={t.forms.subject}>
            <select id="contact-subject" className={inputClass} defaultValue="" {...register('subject')}>
              <option value="">{t.forms.selectSubject}</option>
              {subjects.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field id="contact-message" label={t.forms.message} required error={errors.message?.message}>
          <textarea
            id="contact-message"
            rows={5}
            placeholder={t.forms.placeholders.message}
            aria-invalid={!!errors.message}
            aria-describedby="contact-message-msg"
            className={`${inputClass} min-h-36 resize-y`}
            {...register('message')}
          />
        </Field>

        {status === 'error' && (
          <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-error">
            {t.forms.errors.server}
          </p>
        )}

        <Button type="submit" size="lg" full disabled={isSubmitting}>
          {isSubmitting ? t.forms.sending : t.forms.submit}
          <Send aria-hidden className="size-[18px] rtl:-scale-x-100" />
        </Button>
      </form>

      <ButtonAnchor
        href={whatsappLink(channel.number, pick(channel.message))}
        variant="whatsapp"
        size="lg"
        full
        className="mt-4"
      >
        <WhatsAppIcon className="size-5" />
        {t.contact.whatsappCta}
      </ButtonAnchor>
      <p className="mt-2 text-center text-xs text-gray-400">{t.contact.orForm}</p>
    </>
  );
}
