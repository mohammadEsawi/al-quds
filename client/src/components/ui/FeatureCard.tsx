import type { LucideIcon } from 'lucide-react';

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  text: string;
}

/** Centered icon card (company values, quality standards). */
export function FeatureCard({ icon: Icon, title, text }: FeatureCardProps) {
  return (
    <div className="group h-full rounded-xl border border-gray-100 bg-white px-6 py-8 text-center transition-all duration-300 hover:-translate-y-1 hover:border-primary hover:shadow-lift">
      <div className="mx-auto mb-5 flex size-16 items-center justify-center rounded-xl bg-gray-50 text-primary transition-colors group-hover:bg-primary group-hover:text-white">
        <Icon aria-hidden className="size-7" strokeWidth={1.5} />
      </div>
      <h3 className="font-display text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">{text}</p>
    </div>
  );
}
