import { useEffect } from 'react';

/**
 * The first-load splash lives in index.html (see public/splash.js). It stays on screen until the app says
 * it is ready: mounted, and nothing it needs is still loading. Anything that shows a loading state calls
 * `useSplashHold()`; the splash never waits on it once it is gone, so these are safe to use anywhere.
 */
interface SplashApi {
  mounted(): void;
  hold(): void;
  release(): void;
}

declare global {
  interface Window {
    lamicoSplash?: SplashApi;
  }
}

/** Keeps the splash on screen while the calling component is mounted. */
export function useSplashHold() {
  useEffect(() => {
    window.lamicoSplash?.hold();
    return () => window.lamicoSplash?.release();
  }, []);
}

/** Render this in place of a blank loading state. */
export function SplashHold() {
  useSplashHold();
  return null;
}

/** Call once from the root component after the first render. */
export function useSplashMounted() {
  useEffect(() => {
    window.lamicoSplash?.mounted();
  }, []);
}
