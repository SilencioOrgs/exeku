import type { ExecutionLanguage } from "@/types/execution";

export interface CodeSafetyIssue {
  code: string;
  label: string;
  reason: string;
  fileName?: string;
}

export type CodeSafetyResult =
  | { safe: true }
  | { safe: false; issue: CodeSafetyIssue; message: string };

interface SafetyRule {
  code: string;
  label: string;
  reason: string;
  pattern: RegExp;
}

/**
 * Strips comments outside string literals so comments mentioning restricted APIs
 * do not trigger false positives, while keeping string literals intact so shell
 * payloads like "rm -rf /" inside strings are still caught.
 */
export function stripComments(source: string, language: ExecutionLanguage): string {
  const out: string[] = [];
  const len = source.length;
  let i = 0;

  while (i < len) {
    const ch = source[i];
    const next = i + 1 < len ? source[i + 1] : "";

    if (language === "python") {
      // Triple-quoted strings
      if ((ch === '"' || ch === "'") && source[i + 1] === ch && source[i + 2] === ch) {
        const quote = ch;
        out.push(quote, quote, quote);
        i += 3;
        while (i < len) {
          if (source[i] === "\\" && i + 1 < len) {
            out.push(source[i], source[i + 1]);
            i += 2;
            continue;
          }
          if (source[i] === quote && source[i + 1] === quote && source[i + 2] === quote) {
            out.push(quote, quote, quote);
            i += 3;
            break;
          }
          out.push(source[i]);
          i += 1;
        }
        continue;
      }
      // Single/double-quoted strings
      if (ch === '"' || ch === "'") {
        const quote = ch;
        out.push(quote);
        i += 1;
        while (i < len) {
          if (source[i] === "\\" && i + 1 < len) {
            out.push(source[i], source[i + 1]);
            i += 2;
            continue;
          }
          out.push(source[i]);
          const cur = source[i];
          i += 1;
          if (cur === quote || cur === "\n") break;
        }
        continue;
      }
      // Python line comment
      if (ch === "#") {
        while (i < len && source[i] !== "\n") i += 1;
        continue;
      }
      out.push(ch);
      i += 1;
      continue;
    }

    // C, C++, Java string or char literals
    if (ch === '"' || ch === "'") {
      const quote = ch;
      out.push(quote);
      i += 1;
      while (i < len) {
        if (source[i] === "\\" && i + 1 < len) {
          out.push(source[i], source[i + 1]);
          i += 2;
          continue;
        }
        out.push(source[i]);
        const cur = source[i];
        i += 1;
        if (cur === quote || cur === "\n") break;
      }
      continue;
    }

    // Line comment //
    if (ch === "/" && next === "/") {
      i += 2;
      while (i < len && source[i] !== "\n") i += 1;
      continue;
    }

    // Block comment /* ... */
    if (ch === "/" && next === "*") {
      i += 2;
      while (i < len) {
        if (source[i] === "*" && source[i + 1] === "/") {
          i += 2;
          break;
        }
        if (source[i] === "\n") out.push("\n");
        i += 1;
      }
      continue;
    }

    out.push(ch);
    i += 1;
  }

  return out.join("");
}

const COMMON_RULES: SafetyRule[] = [
  {
    code: "destructive_rm",
    label: "destructive file deletion command",
    reason: "Recursive or forced deletion commands (such as rm -rf) are blocked.",
    pattern: /\brm\s+(?:-[a-zA-Z]*[rf][a-zA-Z]*\b|--recursive\b|--force\b|--no-preserve-root\b)/,
  },
  {
    code: "destructive_windows_cmd",
    label: "destructive Windows system command",
    reason: "Destructive Windows filesystem or disk commands are blocked.",
    pattern: /\b(?:del\s+\/[fqsa]|(?:rd|rmdir)\s+\/s|format\s+[a-z]:)\b/i,
  },
  {
    code: "disk_wipe",
    label: "disk or filesystem wiping command",
    reason: "Low-level disk formatting or wiping commands (mkfs, dd, wipefs, shred) are blocked.",
    pattern: /\b(?:mkfs(?:\.[a-z0-9]+)?|dd\s+if=|wipefs|shred)\b/,
  },
  {
    code: "fork_bomb",
    label: "fork bomb pattern",
    reason: "Process-exhaustion fork bomb patterns are blocked.",
    pattern: /:\(\)\s*\{\s*:\s*\|\s*:\s*&\s*\}\s*;\s*:/,
  },
  {
    code: "os_power_cmd",
    label: "OS shutdown or reboot command",
    reason: "System power, shutdown, or reboot commands are blocked.",
    pattern: /\b(?:shutdown|reboot|poweroff|halt)\s+(?:-[a-zA-Z]|now\b|0\b|\/[sr]\b)/i,
  },
  {
    code: "restricted_os_path",
    label: "restricted OS path access",
    reason: "Accessing sensitive operating system paths (/etc, /dev, /proc, System32) is blocked.",
    pattern: /(?:\/etc\/(?:passwd|shadow|sudoers|fstab)|\/dev\/(?:sd[a-z]\d*|nvme\d|mem|kmem)|\/proc\/(?:self|1)\b|C:\\\\?Windows\\\\?System32)/i,
  },
];

const PYTHON_RULES: SafetyRule[] = [
  {
    code: "python_os_module",
    label: "restricted OS, process, or network module",
    reason: "Modules that run OS commands, modify files, or open sockets (os, subprocess, shutil, ctypes, socket, etc.) are not allowed. Use standard I/O (input(), sys.stdin, print()).",
    pattern:
      /\b(?:from\s+(?:os|subprocess|shutil|pty|ctypes|socket|fcntl|signal|resource|posix|nt|winreg|multiprocessing|pathlib)\b|import\s+[^\n;]*\b(?:os|subprocess|shutil|pty|ctypes|socket|fcntl|signal|resource|posix|nt|winreg|multiprocessing|pathlib)\b)/,
  },
  {
    code: "python_dynamic_import",
    label: "dynamic module import",
    reason: "Dynamic imports (__import__, importlib) are blocked.",
    pattern: /\b(?:__import__|importlib)\b/,
  },
  {
    code: "python_dynamic_exec",
    label: "dynamic code execution",
    reason: "Dynamic execution helpers (eval, exec, compile) are blocked.",
    pattern: /\b(?:eval|exec|compile)\s*\(/,
  },
  {
    code: "python_introspection_escape",
    label: "Python runtime introspection",
    reason: "Low-level Python runtime introspection attributes are blocked.",
    pattern: /\b(?:__subclasses__|__globals__|__builtins__|__class__|__base__|__mro__)\b/,
  },
  {
    code: "python_unsafe_open",
    label: "filesystem write or restricted path open()",
    reason: "Writing files or opening OS paths with open() is blocked. Use input() or sys.stdin for standard input.",
    pattern: /\bopen\s*\(\s*(?:[rfbuRFBU]*["'](?:\s*\/|\.\.|~|[A-Za-z]:\\)|[^)\n]*,\s*(?:mode\s*=\s*)?["'][^"']*[wax+])/,
  },
];

const C_CPP_RULES: SafetyRule[] = [
  {
    code: "c_cpp_restricted_header",
    label: "restricted OS, filesystem, or network header",
    reason: "System, process, filesystem, and socket headers (such as <unistd.h>, <windows.h>, <filesystem>, <sys/socket.h>) are not allowed. Use standard I/O headers.",
    pattern:
      /#\s*include\s*[<"](?:unistd\.h|sys\/(?:socket|stat|types|wait|mount|ptrace|syscall|reboot|mman|ioctl)\.h|dirent\.h|fcntl\.h|signal\.h|netdb\.h|arpa\/inet\.h|netinet\/in\.h|windows\.h|process\.h|shellapi\.h|filesystem|experimental\/filesystem)[>"]/i,
  },
  {
    code: "c_cpp_process_exec",
    label: "OS command or process execution",
    reason: "Executing shell commands or spawning processes (system, popen, fork, exec*) is blocked.",
    pattern:
      /\b(?:system|popen|_popen|pclose|fork|vfork|exec(?:l|le|lp|v|ve|vp|vpe)|spawn(?:l|le|lp|v|ve|vp)|ShellExecute[AW]?|WinExec|CreateProcess[AW]?)\s*\(/,
  },
  {
    code: "c_cpp_destructive_syscall",
    label: "destructive filesystem or OS syscall",
    reason: "Direct filesystem deletion and OS control syscalls (unlink, rmdir, remove_all, chmod, kill, syscall, etc.) are blocked.",
    pattern:
      /\b(?:unlink|unlinkat|rmdir|_rmdir|remove_all|DeleteFile[AW]?|RemoveDirectory[AW]?|chmod|chown|kill|ptrace|syscall|chroot|mount|umount|reboot)\s*\(/,
  },
  {
    code: "c_cpp_filesystem_api",
    label: "filesystem API access",
    reason: "Direct std::filesystem operations are blocked in coding submissions.",
    pattern: /\b(?:std::)?filesystem::/,
  },
  {
    code: "c_cpp_file_remove",
    label: "file deletion via remove()",
    reason: "Deleting files with remove(path) is blocked.",
    pattern: /\bremove\s*\(\s*["']/,
  },
  {
    code: "c_cpp_unsafe_fopen",
    label: "restricted path file access",
    reason: "Opening OS or parent paths with fopen/freopen is blocked.",
    pattern: /\b(?:fopen|freopen)\s*\(\s*["'](?:\s*\/|\.\.|~|[A-Za-z]:\\\\)/,
  },
  {
    code: "c_cpp_inline_asm",
    label: "inline assembly",
    reason: "Inline assembly blocks are blocked.",
    pattern: /\b(?:__asm__|__asm|asm)\s*(?:volatile\s*)?\(/,
  },
];

const JAVA_RULES: SafetyRule[] = [
  {
    code: "java_process_exec",
    label: "OS command or process execution",
    reason: "Running OS commands via Runtime.getRuntime() or ProcessBuilder is blocked.",
    pattern: /\b(?:Runtime\s*\.\s*getRuntime\s*\(|ProcessBuilder\b)/,
  },
  {
    code: "java_nio_files",
    label: "filesystem access via java.nio.file",
    reason: "Direct filesystem manipulation with java.nio.file / Files is blocked. Use System.in and System.out.",
    pattern:
      /\bjava\.nio\.file\b|\bFiles\s*\.\s*(?:delete|deleteIfExists|move|write|writeString|copy|walk|list|createFile|createDirectory|readAllBytes|readString)\s*\(/,
  },
  {
    code: "java_disk_file",
    label: "direct disk file access",
    reason: "Direct disk file classes (File, FileWriter, FileOutputStream, FileInputStream, RandomAccessFile) are blocked. Use Scanner or BufferedReader on System.in.",
    pattern:
      /\b(?:java\.io\.(?:File|FileWriter|FileOutputStream|FileInputStream|RandomAccessFile)|new\s+(?:File|FileWriter|FileOutputStream|FileInputStream|RandomAccessFile))\b/,
  },
  {
    code: "java_network",
    label: "network API access",
    reason: "Networking APIs (java.net) are blocked in coding submissions.",
    pattern: /\bjava\.net\b/,
  },
  {
    code: "java_script_engine",
    label: "dynamic script execution",
    reason: "Dynamic script engines (javax.script) are blocked.",
    pattern: /\b(?:javax\.script|ScriptEngine|ScriptEngineManager)\b/,
  },
  {
    code: "java_native_or_env",
    label: "native library or environment access",
    reason: "Loading native libraries or reading environment variables via System is blocked.",
    pattern: /\bSystem\s*\.\s*(?:load|loadLibrary|getenv)\s*\(/,
  },
  {
    code: "java_unsafe_reflection",
    label: "unsafe reflection or memory access",
    reason: "Reflection and Unsafe memory APIs are blocked.",
    pattern: /\b(?:sun\.misc\.Unsafe|java\.lang\.reflect)\b/,
  },
];

const LANGUAGE_RULES: Record<ExecutionLanguage, SafetyRule[]> = {
  python: PYTHON_RULES,
  c: C_CPP_RULES,
  cpp: C_CPP_RULES,
  java: JAVA_RULES,
};

function formatSafetyMessage(issue: CodeSafetyIssue): string {
  const prefix = issue.fileName ? `Suspicious code blocked in ${issue.fileName}` : "Suspicious code blocked";
  return `${prefix} (${issue.label}): ${issue.reason}`;
}

/**
 * Checks a single source file for suspicious OS, filesystem, process, or network operations.
 * Defense-in-depth guard on top of the isolated Linux sandbox (`isolate`).
 */
export function checkCodeSafety(
  language: ExecutionLanguage,
  sourceCode: string,
  fileName?: string,
): CodeSafetyResult {
  const cleaned = stripComments(sourceCode, language);
  const rules = [...COMMON_RULES, ...LANGUAGE_RULES[language]];

  for (const rule of rules) {
    if (rule.pattern.test(cleaned)) {
      const issue: CodeSafetyIssue = {
        code: rule.code,
        label: rule.label,
        reason: rule.reason,
        ...(fileName ? { fileName } : {}),
      };
      return {
        safe: false,
        issue,
        message: formatSafetyMessage(issue),
      };
    }
  }

  return { safe: true };
}

/** Checks every file in a workspace (main file + companion files). */
export function checkWorkspaceSafety(
  language: ExecutionLanguage,
  files: { name: string; content: string }[],
): CodeSafetyResult {
  for (const file of files) {
    const result = checkCodeSafety(language, file.content, files.length > 1 ? file.name : undefined);
    if (!result.safe) return result;
  }
  return { safe: true };
}
