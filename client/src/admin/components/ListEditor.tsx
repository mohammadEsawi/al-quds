import type { ReactNode } from 'react';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';

interface ListEditorProps<T> {
  items: T[];
  onChange: (items: T[]) => void;
  newItem: () => T;
  renderItem: (item: T, update: (next: T) => void, index: number) => ReactNode;
  addLabel: string;
  emptyText?: string;
  max?: number;
  /** Render items in a compact horizontal strip instead of stacked cards. */
  compact?: boolean;
}

/** Add / edit / reorder / remove rows of any shape (features, specs, gallery, milestones...). */
export function ListEditor<T>({ items, onChange, newItem, renderItem, addLabel, emptyText, max = 50, compact }: ListEditorProps<T>) {
  const move = (from: number, to: number) => {
    if (to < 0 || to >= items.length) return;
    const next = items.slice();
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved as T);
    onChange(next);
  };

  return (
    <div className="space-y-3">
      {items.length === 0 && emptyText && <p className="rounded-lg border border-dashed border-gray-200 px-4 py-6 text-center text-sm text-gray-400">{emptyText}</p>}

      {items.map((item, index) => (
        <div key={index} className={cn('flex items-start gap-3 rounded-lg border border-gray-100 bg-gray-50/60 p-3', compact && 'items-center')}>
          <span className="mt-2 flex size-6 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-gray-400 shadow-sm" dir="ltr">
            {index + 1}
          </span>
          <div className="min-w-0 flex-1">{renderItem(item, (next) => onChange(items.map((it, i) => (i === index ? next : it))), index)}</div>
          <div className="flex shrink-0 flex-col gap-1 sm:flex-row">
            <button type="button" onClick={() => move(index, index - 1)} disabled={index === 0} aria-label="نقل للأعلى" className="rounded-md p-1.5 text-gray-400 hover:bg-white hover:text-gray-700 disabled:opacity-30">
              <ArrowUp aria-hidden className="size-4" />
            </button>
            <button type="button" onClick={() => move(index, index + 1)} disabled={index === items.length - 1} aria-label="نقل للأسفل" className="rounded-md p-1.5 text-gray-400 hover:bg-white hover:text-gray-700 disabled:opacity-30">
              <ArrowDown aria-hidden className="size-4" />
            </button>
            <button type="button" onClick={() => onChange(items.filter((_, i) => i !== index))} aria-label="حذف" className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-error">
              <Trash2 aria-hidden className="size-4" />
            </button>
          </div>
        </div>
      ))}

      {items.length < max && (
        <Button type="button" variant="secondary" size="md" onClick={() => onChange([...items, newItem()])}>
          <Plus aria-hidden className="size-4" />
          {addLabel}
        </Button>
      )}
    </div>
  );
}
