import {
  BadgeCheck,
  Building2,
  CircleDot,
  Droplets,
  Factory,
  FlaskConical,
  Globe,
  Leaf,
  ShieldCheck,
  TrendingUp,
  Users,
  Wheat,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import type { CompanyValue, Sector, Standard } from '@/content/types';

export const sectorIcons: Record<Sector['icon'], LucideIcon> = {
  droplets: Droplets,
  factory: Factory,
  flask: FlaskConical,
  'circle-dot': CircleDot,
  wheat: Wheat,
  building: Building2,
  'trending-up': TrendingUp,
};

export const featureIcons: Record<CompanyValue['icon'] | Standard['icon'], LucideIcon> = {
  shield: ShieldCheck,
  check: BadgeCheck,
  moon: Leaf,
  users: Users,
  bolt: Zap,
  globe: Globe,
};
