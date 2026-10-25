import type { SVGAttributes } from "react";
import {
  Activity, AlarmClock, AlertCircle, ArrowDown, ArrowLeft, ArrowRight, ArrowUp,
  BadgeCheck, BookOpen, Box, Braces, Calendar, CheckCircle2, ChevronDown,
  CircleHelp, CirclePlay, Clipboard, Clock3, Code2, Cog, Copy, Database,
  Download, FileCode2, FileText, Folder, Github, Info, List, LoaderCircle,
  Lock, Maximize2, Menu, Minus, Monitor, Pencil, Play, Plus, Search,
  Settings, Shield, Smartphone, Sparkles, Star, Terminal, User, Wrench, X,
  XCircle, type LucideIcon
} from "lucide-react";
import { cn } from "@/lib/utils";

/** Transitional compatibility API. Renders modern stroke icons in the single neutral UI. */
export type DotIconName = string;
export interface DotIconProps extends SVGAttributes<SVGSVGElement> {
  name: DotIconName;
  adaptive?: boolean;
  grid?: 16 | 32;
  size?: number;
  "aria-label"?: string;
}
const ICONS: Record<string, LucideIcon> = {
  powershell: Terminal, vscode: Code2, cplusplus: Code2, python: Code2, java: Code2,
  file: FileCode2, folder: Folder, document: FileText, box: Box, list: List, burger: Menu,
  windows: Monitor, phone: Smartphone, cog: Settings, settings: Cog, database: Database,
  shield: Shield, arrowRight: ArrowRight, arrowLeft: ArrowLeft, arrowUp: ArrowUp, arrowDown: ArrowDown,
  circlePlay: CirclePlay, circleCheck: CheckCircle2, circleBlock: AlertCircle,
  alarm: AlarmClock, calendar: Calendar, clock: Clock3, copy: Copy, download: Download,
  close: X, x: X, cross: X, pencil: Pencil, stars: Star, star: Star,
  sparkles: Sparkles, user: User, activity: Activity, check: BadgeCheck, plus: Plus,
  minus: Minus, search: Search, code: Braces, info: Info, help: CircleHelp,
  book: BookOpen, play: Play, clipboard: Clipboard, loader: LoaderCircle,
  lock: Lock, maximize: Maximize2, tools: Wrench, github: Github,
  chevronDown: ChevronDown, xCircle: XCircle,
};
export function DotIcon({ name, adaptive: _adaptive, grid: _grid, size = 16, className, "aria-label": label, ...props }: DotIconProps) {
  void _adaptive; void _grid;
  const Icon = ICONS[name] ?? FileCode2;
  return <Icon size={size} strokeWidth={1.8} aria-hidden={label ? undefined : true} aria-label={label}
    role={label ? "img" : "presentation"} className={cn("inline-block shrink-0", className)} {...props} />;
}
