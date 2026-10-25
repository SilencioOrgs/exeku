"use client";

import { useState, type CSSProperties } from "react";
import { DotIcon } from "@/components/retro/dot-icon";
import { useAppearance } from "@/hooks/use-appearance";
import { PixelButton } from "@/components/retro/pixel-button";
import { PixelBadge } from "@/components/retro/pixel-badge";
import { resolveEditorAppearance } from "@/lib/editor-appearance";
import type { AppearancePreferences } from "@/types/appearance";

export function AppearancePreview({ preferences: p, miniature = false, mobile = false }: { preferences: AppearancePreferences; miniature?: boolean; mobile?: boolean }) {
  const { systemColorMode, systemReducedMotion } = useAppearance();
  const [notice, setNotice] = useState(false);
  const mode = p.colorMode === "system" ? systemColorMode : p.colorMode;
  const reduced = p.reducedMotion === "system" ? systemReducedMotion : p.reducedMotion;
  const editor = resolveEditorAppearance(p, mode, reduced);
  const editorDark = editor.theme.endsWith("dark");
  const contrast = editor.theme.includes("-hc-");
  return <div className={`appearance-preview ${miniature ? "preview-miniature" : ""}`} data-preview-mode={mobile ? "mobile" : "desktop"}
    data-ui-style={p.uiStyle} data-palette={p.colorPalette} data-color-mode={mode} data-contrast={p.contrastMode} data-density={p.density} data-ui-font={p.uiFontFamily} data-line-height={p.lineHeight} data-reduced-motion={String(reduced)}
    style={{ "--brightness-factor": p.contrastMode === "high" ? 1 : p.brightness / 100, fontSize: miniature ? "10px" : `${p.uiFontScale * 0.14}px` } as CSSProperties}>
    <aside className="preview-sidebar"><span className="preview-brand"><DotIcon name="vscode" size={17} aria-hidden="true" /> exeku<span className="arcade-decoration">_</span></span><span className="preview-nav-label">Workspace</span>
      <span className="preview-nav active"><DotIcon name="box" size={14} aria-hidden="true" /><span>Overview</span></span><span className="preview-nav"><DotIcon name="list" size={14} aria-hidden="true" /><span>Challenges</span></span><span className="preview-nav"><DotIcon name="powershell" size={14} aria-hidden="true" /><span>Code editor</span></span><span className="preview-nav preview-settings"><DotIcon name="cog" size={14} aria-hidden="true" /><span>Settings</span></span>
    </aside>
    <div className="preview-main"><div className="preview-topbar"><span>Personal workspace</span><span className="preview-avatar">P</span></div><div className="preview-content">
      <header className="preview-welcome"><span className="preview-context">Your space to practice</span><h3>{p.uiStyle === "studio-crm" ? "Workspace overview" : "Ready to build?"}</h3><p>Pick up an idea. Make it work.</p></header>
      <section className="preview-activity"><div className="preview-section-title"><strong>Code workspace</strong><PixelBadge variant="mint" bracketed={false}>Sample</PixelBadge></div>
        <pre style={{ fontFamily: editor.options.fontFamily, fontSize: miniature ? "9px" : `${p.editorFontSize}px`, lineHeight: miniature ? "1.5" : `${editor.options.lineHeight}px`, fontVariantLigatures: p.editorLigatures ? "normal" : "none", background: contrast ? editorDark ? "#000000" : "#FFFFFF" : editorDark ? "#0B0F19" : "#F8FAFC", color: editorDark ? "#E5E7EB" : "#0F172A" }}><code>{'# A small beginning\nprint("Hello, Exeku!")'}</code></pre>
      </section>
      <div className="preview-quick-action"><PixelButton size="sm" type="button" tabIndex={miniature ? -1 : 0} onClick={() => setNotice(true)}>Open workspace <DotIcon name="arrowUp" size={14} aria-hidden="true" /></PixelButton></div>
      {!miniature && <p className="preview-notice" role="status">{notice ? "This is a preview. Your real code and workspace are unchanged." : "Sample interface. No code runs from this preview."}</p>}
    </div></div>
  </div>;
}
