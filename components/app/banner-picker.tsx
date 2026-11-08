import Image from "next/image";
import { Button } from "@/components/ui/button";
import { BANNERS, bannerSrc, type BannerId } from "@/lib/banners";

export function BannerPicker({ value, onChange }: { value: BannerId; onChange: (id: BannerId) => void }) {
  return (
    <div role="group" aria-label="Banner" className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {BANNERS.map((banner) => (
        <Button key={banner.id} type="button" variant="outline" aria-pressed={value === banner.id} onClick={() => onChange(banner.id)} className="h-auto min-w-0 flex-col gap-1 p-1.5">
          <Image src={bannerSrc(banner.id)} alt="" width={1500} height={500} sizes="200px" className="aspect-[3/1] w-full rounded-md object-cover" />
          <span className="w-full truncate text-center text-xs">{banner.label}</span>
        </Button>
      ))}
    </div>
  );
}
