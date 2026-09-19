import { createContext, useCallback, useContext, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Info, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';

// ───────── Layout primitives ─────────

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <section className={cn('rounded-xl border border-gray-100 bg-white shadow-card', className)}>{children}</section>;
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="font-display text-2xl font-bold text-gray-900">{title}</h1>
        {description && <p className="mt-1 text-sm text-gray-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 aria-label="جارٍ التحميل" className={cn('size-6 animate-spin text-primary', className)} />;
}

const badgeTones = {
  gray: 'bg-gray-100 text-gray-600',
  blue: 'bg-blue-50 text-primary',
  green: 'bg-emerald-50 text-emerald-700',
  amber: 'bg-amber-50 text-amber-700',
  red: 'bg-red-50 text-red-600',
  purple: 'bg-violet-50 text-violet-700',
};

export function Badge({ tone = 'gray', children }: { tone?: keyof typeof badgeTones; children: ReactNode }) {
  return <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold', badgeTones[tone])}>{children}</span>;
}

export function EmptyBlock({ title, text, action }: { title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="px-6 py-14 text-center">
      <p className="font-semibold text-gray-700">{title}</p>
      {text && <p className="mt-1 text-sm text-gray-500">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorBlock({ onRetry }: { onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      <AlertTriangle aria-hidden className="size-8 text-error" />
      <p className="text-sm text-gray-600">تعذّر تحميل البيانات.</p>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          إعادة المحاولة
        </Button>
      )}
    </div>
  );
}

// ───────── Modal ─────────

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const modalWidths = { sm: 'max-w-md', md: 'max-w-2xl', lg: 'max-w-4xl', xl: 'max-w-6xl' };

export function Modal({ open, onClose, title, children, footer, size = 'md' }: ModalProps) {
  const titleId = useId();
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    panel.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      previous?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-gray-900/50 p-0 sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn('flex max-h-[92vh] w-full flex-col rounded-t-2xl bg-white shadow-deep outline-none sm:rounded-2xl', modalWidths[size])}
      >
        <header className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 id={titleId} className="font-display text-lg font-bold">
            {title}
          </h2>
          <button type="button" onClick={onClose} aria-label="إغلاق" className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-50 hover:text-gray-700">
            <X aria-hidden className="size-5" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && <footer className="flex flex-wrap justify-end gap-2 border-t border-gray-100 px-6 py-4">{footer}</footer>}
      </div>
    </div>
  );
}

// ───────── Toasts ─────────

type ToastKind = 'success' | 'error' | 'info';
interface ToastItem {
  id: number;
  kind: ToastKind;
  text: string;
}
interface ToastApi {
  success: (text: string) => void;
  error: (text: string) => void;
  info: (text: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const counter = useRef(0);

  const push = useCallback((kind: ToastKind, text: string) => {
    const id = ++counter.current;
    setItems((list) => [...list, { id, kind, text }]);
    window.setTimeout(() => setItems((list) => list.filter((t) => t.id !== id)), kind === 'error' ? 6000 : 3500);
  }, []);

  const api = useRef<ToastApi>({
    success: (t) => push('success', t),
    error: (t) => push('error', t),
    info: (t) => push('info', t),
  });

  const icons = { success: CheckCircle2, error: AlertTriangle, info: Info };
  const tones = { success: 'text-emerald-600', error: 'text-error', info: 'text-primary' };

  return (
    <ToastContext.Provider value={api.current}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed start-4 bottom-4 z-[100] flex max-w-sm flex-col gap-2">
        {items.map((item) => {
          const Icon = icons[item.kind];
          return (
            <div key={item.id} role="status" className="pointer-events-auto flex items-start gap-3 rounded-xl border border-gray-100 bg-white px-4 py-3 text-sm shadow-lift">
              <Icon aria-hidden className={cn('mt-0.5 size-5 shrink-0', tones[item.kind])} />
              <span>{item.text}</span>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const value = useContext(ToastContext);
  if (!value) throw new Error('useToast must be used inside <ToastProvider>');
  return value;
}

// ───────── Confirm dialog ─────────

interface ConfirmOptions {
  title: string;
  text?: string;
  confirmLabel?: string;
  danger?: boolean;
}

const ConfirmContext = createContext<((options: ConfirmOptions) => Promise<boolean>) | null>(null);

/** `const confirm = useConfirm(); if (await confirm({ title: 'حذف؟', danger: true })) ...` */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<(ConfirmOptions & { resolve: (v: boolean) => void }) | null>(null);

  const confirm = useCallback((options: ConfirmOptions) => new Promise<boolean>((resolve) => setState({ ...options, resolve })), []);
  const close = (result: boolean) => {
    state?.resolve(result);
    setState(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal
        open={!!state}
        onClose={() => close(false)}
        title={state?.title ?? ''}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => close(false)}>
              إلغاء
            </Button>
            <Button className={state?.danger ? '!border-error !bg-error hover:!bg-red-600' : undefined} onClick={() => close(true)}>
              {state?.confirmLabel ?? 'تأكيد'}
            </Button>
          </>
        }
      >
        {state?.text && <p className="text-sm leading-relaxed text-gray-600">{state.text}</p>}
      </Modal>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const value = useContext(ConfirmContext);
  if (!value) throw new Error('useConfirm must be used inside <ConfirmProvider>');
  return value;
}
