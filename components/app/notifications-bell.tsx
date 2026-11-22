"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Building2,
  CalendarClock,
  CheckCheck,
  Code2,
  GraduationCap,
  Loader2,
  Megaphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/notifications/api";
import type { NotificationItem, NotificationKind } from "@/types/notifications";
import type { UserRole } from "@/types/roles";

function formatDueChip(dueAt: string): { label: string; urgent: boolean } {
  const dueMs = Date.parse(dueAt);
  if (Number.isNaN(dueMs)) return { label: "Deadline", urgent: false };
  const diffMs = dueMs - Date.now();
  if (diffMs < 0) return { label: "Past due", urgent: true };
  const hours = Math.round(diffMs / 3_600_000);
  if (hours < 1) return { label: "Due < 1h", urgent: true };
  if (hours < 24) return { label: `Due in ${hours}h`, urgent: true };
  const days = Math.round(hours / 24);
  if (days <= 3) return { label: `Due in ${days}d`, urgent: true };
  return {
    label: `Due ${new Date(dueMs).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`,
    urgent: false,
  };
}

function NotificationIcon({ kind }: { kind: NotificationKind }) {
  if (kind === "class_deadline") return <CalendarClock size={15} className="text-[var(--color-primary-text)]" aria-hidden="true" />;
  if (kind === "class_problem") return <Code2 size={15} className="text-[var(--color-primary-text)]" aria-hidden="true" />;
  if (kind === "org_status") return <Building2 size={15} className="text-[var(--color-mint)]" aria-hidden="true" />;
  if (kind === "faculty_status") return <GraduationCap size={15} className="text-[var(--color-mint)]" aria-hidden="true" />;
  return <Megaphone size={15} className="text-[var(--color-primary-text)]" aria-hidden="true" />;
}

export function NotificationsBell({ onRoleLoaded }: { onRoleLoaded?: (role: UserRole) => void }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const load = useCallback(async () => {
    const res = await fetchNotifications();
    setLoading(false);
    if (res.ok) {
      setItems(res.data.notifications);
      setUnreadCount(res.data.unreadCount);
      onRoleLoaded?.(res.data.role);
    }
  }, [onRoleLoaded]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    const onFocus = () => void load();
    window.addEventListener("focus", onFocus);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [load, pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    const onOutside = (e: Event) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onOutside);
    document.addEventListener("focusin", onOutside);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onOutside);
      document.removeEventListener("focusin", onOutside);
    };
  }, [open]);

  const handleItemClick = (item: NotificationItem) => {
    setOpen(false);
    if (!item.read && !item.synthetic) {
      setItems((prev) => prev.map((n) => (n.id === item.id ? { ...n, read: true } : n)));
      setUnreadCount((c) => Math.max(0, c - 1));
      void markNotificationRead(item.id);
    }
  };

  const handleMarkAll = async () => {
    setMarkingAll(true);
    try {
      const res = await markAllNotificationsRead();
      if (res.ok) {
        setItems((prev) => {
          const next = prev.map((n) => (n.synthetic ? n : { ...n, read: true }));
          setUnreadCount(next.filter((n) => !n.read).length);
          return next;
        });
      }
    } finally {
      setMarkingAll(false);
    }
  };

  const hasStoredUnread = items.some((n) => !n.read && !n.synthetic);

  return (
    <div ref={containerRef} className="relative">
      <Button
        ref={triggerRef}
        type="button"
        variant="ghost"
        size="icon"
        aria-label={unreadCount > 0 ? `Notifications (${unreadCount} unread)` : "Notifications"}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => {
          const next = !open;
          setOpen(next);
          if (next) void load();
        }}
        className="relative"
      >
        <Bell size={17} aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="font-code absolute -top-0.5 -right-0.5 grid min-w-[18px] place-items-center rounded-full bg-[var(--color-primary)] px-1 text-xs font-semibold leading-[18px] text-[var(--primary-foreground)]">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </Button>

      {open && (
        <div
          role="dialog"
          aria-label="Notifications"
          className="skeuo-panel absolute right-0 z-50 mt-2 w-[min(22rem,calc(100vw-1.5rem))] overflow-hidden p-0"
        >
          <div className="flex items-center justify-between gap-2 border-b border-[var(--color-border)] px-4 py-3">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold">Notifications</h2>
              {unreadCount > 0 && (
                <span className="rounded-md bg-[var(--color-surface)] px-1.5 py-0.5 font-code text-xs text-[var(--color-primary-text)]">
                  {unreadCount} new
                </span>
              )}
            </div>
            {hasStoredUnread && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={markingAll}
                onClick={() => void handleMarkAll()}
                className="h-7 px-2 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]"
              >
                {markingAll ? (
                  <Loader2 size={12} className="animate-spin" aria-hidden="true" />
                ) : (
                  <CheckCheck size={13} aria-hidden="true" />
                )}
                {markingAll ? "Marking…" : "Mark all read"}
              </Button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto divide-y divide-[var(--color-border)]">
            {loading ? (
              <div className="space-y-3 p-4">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="flex gap-3">
                    <Skeleton className="size-8 shrink-0 rounded-lg" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3.5 w-40" />
                      <Skeleton className="h-3 w-52" />
                    </div>
                  </div>
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="px-4 py-8 text-center text-xs text-[var(--color-text-muted)]">
                You&apos;re all caught up. Deadlines, class activities, and organization updates will appear here.
              </div>
            ) : (
              items.map((item) => {
                const due = item.dueAt ? formatDueChip(item.dueAt) : null;
                const inner = (
                  <div className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-[var(--color-elevated)]/60">
                    <span className="skeuo-well mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg border">
                      <NotificationIcon kind={item.kind} />
                    </span>
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-xs leading-snug ${item.read ? "text-[var(--color-text-muted)]" : "font-semibold text-[var(--color-text-main)]"}`}>
                          {item.title}
                        </p>
                        {!item.read && (
                          <span className="mt-1 size-2 shrink-0 rounded-full bg-[var(--color-primary)]" aria-label="Unread" />
                        )}
                      </div>
                      {item.body && (
                        <p className="line-clamp-2 text-xs text-[var(--color-text-muted)]">{item.body}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-2 pt-0.5">
                        {due && (
                          <span
                            className={`rounded px-1.5 py-0.5 font-code text-xs ${
                              due.urgent
                                ? "bg-[var(--color-hard-bg)] text-[var(--color-pink)]"
                                : "bg-[var(--color-surface)] text-[var(--color-primary-text)]"
                            }`}
                          >
                            {due.label}
                          </span>
                        )}
                        <span className="font-code text-xs text-[var(--color-text-muted)]">
                          {new Date(item.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                        </span>
                      </div>
                    </div>
                  </div>
                );

                return item.href ? (
                  <Link key={item.id} href={item.href} onClick={() => handleItemClick(item)} className="block">
                    {inner}
                  </Link>
                ) : (
                  <Button
                    key={item.id}
                    type="button"
                    variant="ghost"
                    onClick={() => handleItemClick(item)}
                    className="h-auto w-full justify-start rounded-none p-0 text-left font-normal"
                  >
                    {inner}
                  </Button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
