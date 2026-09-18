import { useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2, Send } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/Button';
import { Field, inputClass } from '@/components/ui/FormField';
import { useI18n } from '@/i18n/I18nProvider';
import { applicationSchema, CV_MAX_MB, type ApplicationValues } from '@/lib/schemas';
import { submitApplication } from '@/services/forms.service';

interface JobApplicationFormProps {
  /** Job id, or `general` for a spontaneous application. */
  jobId: string;
  /** Pre-filled position (usually the job title). */
  position?: string;
}

const SUCCESS = {
  ar: 'تم استلام طلبك بنجاح، شكرًا لاهتمامك بالانضمام إلى لاميكو.',
  en: 'Your application has been received. Thank you for your interest in joining Lamico.',
};

export function JobApplicationForm({ jobId, position = '' }: JobApplicationFormProps) {
  const { t, locale, format } = useI18n();
  const schema = useMemo(() => applicationSchema(t.forms.errors), [t]);
  const [status, setStatus] = useState<'idle' | 'sent' | 'error'>('idle');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ApplicationValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName: '',
      phone: '',
      email: '',
      city: '',
      position,
      education: '',
      experience: '',
      message: '',
      linkedin: '',
      portfolio: '',
      website: '',
    },
  });

  const onSubmit = handleSubmit(async ({ cv, website, ...values }) => {
    if (website) return setStatus('sent'); // honeypot
    const body = new FormData();
    Object.entries(values).forEach(([key, value]) => body.append(key, String(value ?? '')));
    const file = cv[0];
    if (file) body.append('cv', file);
    try {
      await submitApplication(jobId, body);
      setStatus('sent');
    } catch {
      setStatus('error');
    }
  });

  if (status === 'sent') {
    return (
      <div role="status" className="py-10 text-center">
        <CheckCircle2 aria-hidden className="mx-auto mb-4 size-16 text-success" />
        <p className="font-display text-xl font-semibold">{SUCCESS[locale]}</p>
      </div>
    );
  }

  const text = (
    id: keyof ApplicationValues,
    label: string,
    opts: { required?: boolean; type?: string; dir?: 'ltr'; autoComplete?: string; readOnly?: boolean } = {},
  ) => (
    <Field id={`app-${id}`} label={label} required={opts.required} error={errors[id]?.message as string | undefined}>
      <input
        id={`app-${id}`}
        type={opts.type ?? 'text'}
        dir={opts.dir}
        autoComplete={opts.autoComplete}
        readOnly={opts.readOnly}
        aria-invalid={!!errors[id]}
        aria-describedby={`app-${id}-msg`}
        className={inputClass}
        {...register(id as Exclude<keyof ApplicationValues, 'cv'>)}
      />
    </Field>
  );

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <input type="text" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" {...register('website')} />

      <div className="grid gap-5 sm:grid-cols-2">
        {text('fullName', t.forms.fullName, { required: true, autoComplete: 'name' })}
        {text('phone', t.forms.phone, { required: true, type: 'tel', dir: 'ltr', autoComplete: 'tel' })}
        {text('email', t.forms.email, { required: true, type: 'email', dir: 'ltr', autoComplete: 'email' })}
        {text('city', t.forms.city, { required: true })}
        {text('position', t.forms.position, { required: true })}
        {text('education', t.forms.education, { required: true })}
      </div>

      <Field id="app-experience" label={t.forms.experience} required error={errors.experience?.message}>
        <textarea
          id="app-experience"
          rows={3}
          aria-invalid={!!errors.experience}
          aria-describedby="app-experience-msg"
          className={`${inputClass} resize-y`}
          {...register('experience')}
        />
      </Field>

      <Field id="app-message" label={`${t.forms.message} (${t.forms.optional})`}>
        <textarea id="app-message" rows={3} className={`${inputClass} resize-y`} {...register('message')} />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        {text('linkedin', t.forms.linkedin, { type: 'url', dir: 'ltr' })}
        {text('portfolio', t.forms.portfolio, { type: 'url', dir: 'ltr' })}
      </div>

      <Field
        id="app-cv"
        label={t.forms.cv}
        required
        error={errors.cv?.message as string | undefined}
        help={format(t.forms.cvHelp, { size: CV_MAX_MB })}
      >
        <input
          id="app-cv"
          type="file"
          accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          aria-invalid={!!errors.cv}
          aria-describedby="app-cv-msg"
          className={`${inputClass} p-3 file:me-4 file:rounded-full file:border-0 file:bg-primary file:px-4 file:py-1.5 file:text-sm file:font-semibold file:text-white`}
          {...register('cv')}
        />
      </Field>

      {status === 'error' && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-error">
          {t.forms.errors.server}
        </p>
      )}

      <Button type="submit" size="lg" full disabled={isSubmitting}>
        {isSubmitting ? t.forms.sending : t.careers.apply}
        <Send aria-hidden className="size-[18px] rtl:-scale-x-100" />
      </Button>
    </form>
  );
}
