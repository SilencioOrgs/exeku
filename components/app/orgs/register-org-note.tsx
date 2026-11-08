import { buttonVariants } from "@/components/ui/button";
import { EXEKU_CONTACT_EMAIL } from "@/lib/contact";

export function RegisterOrgNote() {
  return (
    <div className="skeuo-recess flex flex-wrap items-center justify-between gap-3 rounded-xl p-4">
      <div className="min-w-0 flex-1 basis-56">
        <p className="text-sm font-medium">Register your organization</p>
        <p className="text-xs text-[var(--color-text-muted)]">Officers contact Exeku to set up their organization. Other students can then apply to join.</p>
      </div>
      {EXEKU_CONTACT_EMAIL ? (
        <a href={`mailto:${EXEKU_CONTACT_EMAIL}?subject=Register%20our%20organization`} className={buttonVariants({ variant: "outline" })}>Contact Exeku</a>
      ) : (
        <span className="text-xs text-[var(--color-text-muted)]">Contact details coming soon</span>
      )}
    </div>
  );
}
