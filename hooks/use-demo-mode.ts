"use client";

import { useState } from "react";
import {
  DEMO_SOLVED_PYTHON,
  DEMO_INCORRECT_PYTHON,
  isCodeMatchingDemoSolved,
  isCodeMatchingDemoIncorrect,
} from "@/lib/demo/demo-simulation";

export type DemoState = "idle" | "solved" | "incorrect" | "modified";

/**
 * Frontend-only demo for when no sandbox is running. Opt-in only (?demo=1 or the toggle),
 * and demo results are always labeled as demo and never counted as challenge attempts.
 */
export function useDemoMode(demoParam: string | null) {
  const [toggle, setToggle] = useState<boolean | null>(null);
  const isDemoMode = toggle ?? (demoParam === "true" || demoParam === "1");
  const [demoState, setDemoState] = useState<DemoState>("idle");

  const noteCodeChange = (code: string, isMainFile: boolean) => {
    if (!isDemoMode) return;
    setDemoState(isMainFile && isCodeMatchingDemoSolved(code) ? "solved" : isMainFile && isCodeMatchingDemoIncorrect(code) ? "incorrect" : "modified");
  };

  return {
    isDemoMode,
    setDemoMode: setToggle,
    demoState,
    setDemoState,
    noteCodeChange,
    demoNote: isDemoMode && demoState === "modified" ? "Edited code is not checked in demo mode. Run it in the sandbox or load a demo preset." : null,
    solvedCode: DEMO_SOLVED_PYTHON,
    incorrectCode: DEMO_INCORRECT_PYTHON,
  };
}
