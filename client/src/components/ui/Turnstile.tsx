import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useAsync } from '@/hooks/useAsync';
import { useI18n } from '@/i18n/I18nProvider';
import { getPublicConfig } from '@/services/config.service';

interface TurnstileApi {
  render(
    container: HTMLElement,
    options: {
      sitekey: string;
      language?: string;
      theme?: 'light' | 'dark' | 'auto';
      callback: (token: string) => void;
      'expired-callback': () => void;
      'error-callback': () => void;
    },
  ): string;
  remove(widgetId: string): void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SCRIPT = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
let scriptPromise: Promise<void> | undefined;

function loadScript(): Promise<void> {
  scriptPromise ??= new Promise<void>((resolve, reject) => {
    if (window.turnstile) return resolve();
    const script = document.createElement('script');
    script.src = SCRIPT;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      scriptPromise = undefined; // allow a retry on the next form
      reject(new Error('Turnstile failed to load'));
    };
    document.head.appendChild(script);
  });
  return scriptPromise;
}

function Widget({ siteKey, onToken }: { siteKey: string; onToken: (token: string | null) => void }) {
  const { locale } = useI18n();
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let widgetId: string | undefined;
    let cancelled = false;
    loadScript()
      .then(() => {
        if (cancelled || !box.current || !window.turnstile) return;
        widgetId = window.turnstile.render(box.current, {
          sitekey: siteKey,
          language: locale,
          theme: 'light',
          callback: (token) => onToken(token),
          'expired-callback': () => onToken(null),
          'error-callback': () => onToken(null),
        });
      })
      .catch(() => onToken(null));
    return () => {
      cancelled = true;
      if (widgetId && window.turnstile) window.turnstile.remove(widgetId);
    };
  }, [siteKey, locale, onToken]);

  return <div ref={box} className="min-h-[65px]" />;
}

export interface Captcha {
  /** True when the server asks for a CAPTCHA (Turnstile keys are configured). */
  enabled: boolean;
  /** The solved token, or null until the visitor completes the check. */
  token: string | null;
  /** Put this inside the form. */
  element: ReactNode;
  /** A token works once: call this after every submit attempt. */
  reset: () => void;
}

/**
 * Cloudflare Turnstile for the public forms. When no keys are configured on the server this does
 * nothing (`enabled` is false), so the forms work exactly as before.
 */
export function useCaptcha(): Captcha {
  const config = useAsync(() => getPublicConfig(), []);
  const siteKey = config.data?.turnstileSiteKey ?? null;
  const [token, setToken] = useState<string | null>(null);
  const [round, setRound] = useState(0);

  const reset = useCallback(() => {
    setToken(null);
    setRound((n) => n + 1);
  }, []);

  return {
    enabled: siteKey !== null,
    token,
    reset,
    element: siteKey ? <Widget key={round} siteKey={siteKey} onToken={setToken} /> : null,
  };
}
