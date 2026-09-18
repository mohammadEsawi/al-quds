import { SectorCard } from '@/components/ui/SectorCard';
import { Reveal } from '@/components/ui/Reveal';
import { useSiteData } from '@/context/SiteData';

/** Grid of every business sector. The first card spans two columns on large screens to create rhythm. */
export function SectorsGrid() {
  const { sectors } = useSiteData();

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {sectors.map((sector, index) => (
        <Reveal key={sector.key} delay={(index % 3) * 0.08} className={index === 0 ? 'lg:col-span-2' : undefined}>
          <SectorCard sector={sector} className="h-full" />
        </Reveal>
      ))}
    </div>
  );
}
