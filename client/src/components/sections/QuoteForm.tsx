import { useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2, Send } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/Button';
import { Field, inputClass } from '@/components/ui/FormField';
import { useCaptcha } from '@/components/ui/Turnstile';
import type { Product, ProductSector } from '@/content/types';
import { useI18n } from '@/i18n/I18nProvider';
import { quoteSchema, type QuoteValues } from '@/lib/schemas';
import { submitQuote } from '@/services/forms.service';

const SECTORS: ProductSector[] = ['water', 'plastic', 'preforms', 'caps', 'food'];

interface QuoteFormProps {
  products: Product[];
  /** Slug that starts selected ("" = a general request). */
  initialSlug: string;
}

/** "Request a quote": for companies that want a price on a product and a quantity. */
export function QuoteForm({ products, initialSlug }: QuoteFormProps) {
  const { t, pick } = useI18n();
  const schema = useMemo(() => quoteSchema(t.forms.errors), [t]);
  const captcha = useCaptcha();
  const [status, setStatus] = useState<'idle' | 'sent' | 'error' | 'captcha'>('idle');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<QuoteValues>({
    resolver: zodResolver(schema),
    defaultValues: { productSlug: initialSlug, company: '', name: '', email: '', phone: '', quantity: '', city: '', message: '', website: '' },
  });

  const onSubmit = handleSubmit(async ({ website, productSlug, ...values }) => {
    if (website) return setStatus('sent'); // honeypot filled: silently drop
    if (captcha.enabled && !captcha.token) return setStatus('captcha');
    const product = products.find((p) => p.slug === productSlug);
    try {
      await submitQuote(
        {
          ...(product && { productSlug: product.slug }),
          productName: product ? pick(product.name) : t.quote.productAny,
          ...values,
          city: values.city || undefined,
          message: values.message || undefined,
        },
        captcha.token,
      );
      setStatus('sent');
    } catch {
      setStatus('error');
    } finally {
      captcha.reset();
    }
  });

  if (status === 'sent') {
    return (
      <div role="status" className="py-10 text-center">
        <CheckCircle2 aria-hidden className="mx-auto mb-4 size-16 text-success" />
        <h3 className="font-display text-2xl font-semibold">{t.quote.successTitle}</h3>
        <p className="mt-2 text-gray-600">{t.quote.successText}</p>
      </div>
    );
  }

  const text = (
    id: keyof QuoteValues,
    label: string,
    opts: { required?: boolean; type?: string; dir?: 'ltr'; autoComplete?: string; placeholder?: string; help?: string } = {},
  ) => (
    <Field id={`quote-${id}`} label={label} required={opts.required} help={opts.help} error={errors[id]?.message}>
      <input
        id={`quote-${id}`}
        type={opts.type ?? 'text'}
        dir={opts.dir}
        autoComplete={opts.autoComplete}
        placeholder={opts.placeholder}
        aria-invalid={!!errors[id]}
        aria-describedby={`quote-${id}-msg`}
        className={inputClass}
        {...register(id)}
      />
    </Field>
  );

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      {/* honeypot */}
      <input type="text" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" {...register('website')} />

      <Field id="quote-productSlug" label={t.quote.productLabel}>
        <select id="quote-productSlug" className={inputClass} {...register('productSlug')}>
          <option value="">{t.quote.productAny}</option>
          {SECTORS.map((sector) => {
            const list = products.filter((p) => p.sector === sector);
            return list.length ? (
              <optgroup key={sector} label={t.nav[sector]}>
                {list.map((p) => (
                  <option key={p.slug} value={p.slug}>
                    {pick(p.name)}
                  </option>
                ))}
              </optgroup>
            ) : null;
          })}
        </select>
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        {text('company', t.quote.company, { required: true, autoComplete: 'organization' })}
        {text('name', t.quote.name, { required: true, autoComplete: 'name' })}
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        {text('email', t.forms.email, { required: true, type: 'email', dir: 'ltr', autoComplete: 'email', placeholder: t.forms.placeholders.email })}
        {text('phone', t.forms.phone, { required: true, type: 'tel', dir: 'ltr', autoComplete: 'tel', placeholder: t.forms.placeholders.phone })}
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        {text('quantity', t.quote.quantity, { required: true, help: t.quote.quantityHint })}
        {text('city', t.quote.city, { autoComplete: 'address-level2' })}
      </div>

      <Field id="quote-message" label={t.quote.notes} help={t.quote.notesHint} error={errors.message?.message}>
        <textarea id="quote-message" rows={4} className={`${inputClass} min-h-28 resize-y`} {...register('message')} />
      </Field>

      {captcha.element}

      {status === 'captcha' && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-error">
          {t.forms.errors.captcha}
        </p>
      )}
      {status === 'error' && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-error">
          {t.forms.errors.server}
        </p>
      )}

      <Button type="submit" size="lg" full disabled={isSubmitting}>
        {isSubmitting ? t.forms.sending : t.quote.submit}
        <Send aria-hidden className="size-[18px] rtl:-scale-x-100" />
      </Button>
    </form>
  );
}
