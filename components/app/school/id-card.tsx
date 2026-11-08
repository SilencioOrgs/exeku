import { PixelAvatar } from "@/components/retro/pixel-avatar";

export interface IdCardProps {
  fullName: string;
  school: string;
  campus: string;
  pending: boolean;
  avatarId: string;
}

/** Decorative. Every value is already on the page as text, so screen readers skip it. */
export function IdCard({ fullName, school, campus, pending, avatarId }: IdCardProps) {
  return (
    <div aria-hidden="true" className="flex w-full flex-col items-center">
      <div className="id-clip" />
      <div className="id-sleeve">
        <div className="id-card">
          <div className="id-card-head"><span>exeku</span><span>Student</span></div>
          <div className="px-3.5 pt-3 pb-3.5">
            <PixelAvatar avatarId={avatarId} size={64} className="id-card-photo" aria-hidden="true" />
            <p className="mt-2.5 text-base leading-tight font-semibold break-words text-[var(--id-ink)]">{fullName}</p>
            <p className="mt-2 text-xs leading-snug break-words text-[var(--id-ink-muted)]">
              {school || "Your school"}{campus ? <><br />{campus}</> : null}
            </p>
            {pending && <p className="mt-1 text-xs font-medium text-[var(--id-ink)]">School pending review</p>}
            <div className="id-barcode mt-3" />
          </div>
        </div>
      </div>
    </div>
  );
}
