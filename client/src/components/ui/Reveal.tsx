import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

type Direction = 'up' | 'left' | 'right' | 'scale' | 'fade';

interface RevealProps {
  children: ReactNode;
  direction?: Direction;
  /** Seconds. */
  delay?: number;
  className?: string;
  as?: 'div' | 'li' | 'article' | 'section';
}

const offsets: Record<Direction, { x?: number; y?: number; scale?: number }> = {
  up: { y: 28 },
  left: { x: -36 },
  right: { x: 36 },
  scale: { scale: 0.94 },
  fade: {},
};

/** Fades content in when it scrolls into view. Respects prefers-reduced-motion. */
export function Reveal({ children, direction = 'up', delay = 0, className, as = 'div' }: RevealProps) {
  const reduced = useReducedMotion();
  const Component = motion[as];

  if (reduced) return <Component className={className}>{children}</Component>;

  return (
    <Component
      className={className}
      initial={{ opacity: 0, ...offsets[direction] }}
      whileInView={{ opacity: 1, x: 0, y: 0, scale: 1 }}
      viewport={{ once: true, margin: '0px 0px -60px 0px' }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </Component>
  );
}
