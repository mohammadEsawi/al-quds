import { ImagePlus } from 'lucide-react';
import { useI18n } from '@/i18n/I18nProvider';
import { cn } from '@/lib/cn';

interface ImagePlaceholderProps {
  /** Asset key shown to the team, e.g. `UPLOAD CAP IMAGE`. */
  label: string;
  className?: string;
}

/**
 * Clearly labelled stand-in for an image that has not been uploaded yet.
 * Real images come from the CMS / asset paths — never from component code.
 */
export function ImagePlaceholder({ label, className }: ImagePlaceholderProps) {
  const { t } = useI18n();
  return (
    <div
      role="img"
      aria-label={label}
      className={cn(
        'flex size-full flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-300 bg-gray-50 p-4 text-center text-gray-400',
        className,
      )}
    >
      <ImagePlus aria-hidden className="size-8" />
      <span dir="ltr" className="text-xs font-semibold tracking-wider">
        [ {label} ]
      </span>
      <span className="text-xs">{t.placeholders.label}</span>
    </div>
  );
}
