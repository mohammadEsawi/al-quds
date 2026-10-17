import { UserRound } from 'lucide-react';
import { cn } from '@/lib/cn';

interface PersonPhotoProps {
  photo?: string;
  /** Used as the picture's description; may be empty for a placeholder. */
  name: string;
  /** `small` is the compact frame used beside a message; it takes its width from `className`. */
  size?: 'large' | 'small';
  className?: string;
}

/**
 * A portrait frame. Until a photo is uploaded from the dashboard it shows a calm silhouette,
 * so the page looks finished and nothing is invented.
 *
 * `small` (the homepage message cards) sizes the photo up and pins it to the top instead of a
 * plain `object-cover`, so the face reads clearly at that tiny size instead of showing the whole
 * body far away. Done with the image's own (larger) layout size rather than a CSS `transform:
 * scale`, which Chrome rasterizes onto a low-resolution layer at small sizes and renders blurry.
 */
export function PersonPhoto({ photo, name, size = 'large', className }: PersonPhotoProps) {
  return (
    <div
      className={cn(
        'relative aspect-[4/5] overflow-hidden bg-linear-to-b from-gray-50 to-gray-100 ring-1 ring-gray-100',
        size === 'large' ? 'rounded-3xl shadow-card' : 'rounded-2xl',
        className,
      )}
    >
      {photo ? (
        size === 'small' ? (
          <img src={photo} alt={name} loading="lazy" className="absolute left-1/2 top-0 h-[190%] w-auto -translate-x-1/2" />
        ) : (
          <img src={photo} alt={name} loading="lazy" className="size-full object-cover" />
        )
      ) : (
        <div role="img" aria-label={name} className="flex size-full items-end justify-center">
          <UserRound aria-hidden strokeWidth={1} className="size-4/5 translate-y-[8%] text-gray-300" />
        </div>
      )}
    </div>
  );
}
