import { existsSync, lstatSync, readdirSync, realpathSync } from "node:fs";
import { delimiter, dirname, join, sep } from "node:path";
import type { Language } from "./types.ts";

/** Absolute, symlink-free paths. The sandbox sees /usr, /bin and /lib but not /etc, so alternatives links would break. */
export interface Toolchain {
  python3?: string;
  gcc?: string;
  gxx?: string;
  javac?: string;
  java?: string;
  /** Extra host directories the JVM needs, bound read-only (Ubuntu keeps the JDK conf in /etc). */
  javaDirs: string[];
}

export interface LanguageSpec {
  mainFile: string;
  /** Compiler argv for the given files, or undefined for interpreted languages. */
  compile?: (files: string[]) => string[];
  run: (memoryLimitKb: number) => string[];
  /** Processes and threads the program may start. The JVM needs many. */
  processes: number;
  /** Memory the runtime itself needs on top of the problem's limit. */
  memoryOverheadKb: number;
  dirs: string[];
}

function findOnPath(name: string, pathEnv = process.env.PATH ?? ""): string | undefined {
  for (const dir of pathEnv.split(delimiter)) {
    if (!dir) continue;
    const candidate = join(dir, name);
    if (existsSync(candidate)) return realpathSync(candidate);
  }
  return undefined;
}

/**
 * Top-level directories under `outside` that symlinks inside `dir` point to. Ubuntu's JDK keeps
 * conf/security/java.security as a link into /etc/java-17-openjdk, which the sandbox cannot see.
 */
export function linkedDirsOutside(dir: string, outside = "/etc/"): string[] {
  const found = new Set<string>();
  const walk = (path: string) => {
    for (const name of readdirSync(path)) {
      const child = join(path, name);
      const info = lstatSync(child);
      if (info.isSymbolicLink()) {
        if (!existsSync(child)) continue;
        const target = realpathSync(child);
        if (target.startsWith(outside)) found.add(join(outside, target.slice(outside.length).split(sep)[0]));
      } else if (info.isDirectory()) {
        walk(child);
      }
    }
  };
  if (existsSync(dir)) {
    const real = realpathSync(dir);
    if (real.startsWith(outside)) found.add(join(outside, real.slice(outside.length).split(sep)[0]));
    else walk(dir);
  }
  return [...found];
}

export function detectToolchain(pathEnv?: string): Toolchain {
  const java = findOnPath("java", pathEnv);
  const javaDirs = java ? linkedDirsOutside(join(dirname(dirname(java)), "conf")) : [];
  return {
    python3: findOnPath("python3", pathEnv),
    gcc: findOnPath("gcc", pathEnv),
    gxx: findOnPath("g++", pathEnv),
    javac: findOnPath("javac", pathEnv),
    java,
    javaDirs,
  };
}

const withExt = (files: string[], ext: string) =>
  files.filter((name) => name.endsWith(ext)).map((name) => `./${name}`);

export function buildLanguageSpecs(tools: Toolchain): Partial<Record<Language, LanguageSpec>> {
  const specs: Partial<Record<Language, LanguageSpec>> = {};
  if (tools.python3) {
    const python3 = tools.python3;
    specs.python = {
      mainFile: "main.py",
      run: () => [python3, "-B", "main.py"],
      processes: 1,
      memoryOverheadKb: 0,
      dirs: [],
    };
  }
  if (tools.gcc) {
    const gcc = tools.gcc;
    specs.c = {
      mainFile: "main.c",
      compile: (files) => [gcc, "-O2", "-pipe", "-std=gnu17", "-o", "main", ...withExt(files, ".c"), "-lm"],
      run: () => ["./main"],
      processes: 1,
      memoryOverheadKb: 0,
      dirs: [],
    };
  }
  if (tools.gxx) {
    const gxx = tools.gxx;
    specs.cpp = {
      mainFile: "main.cpp",
      compile: (files) => [gxx, "-O2", "-pipe", "-std=gnu++17", "-o", "main", ...withExt(files, ".cpp")],
      run: () => ["./main"],
      processes: 1,
      memoryOverheadKb: 0,
      dirs: [],
    };
  }
  if (tools.javac && tools.java) {
    const { javac, java } = tools;
    specs.java = {
      mainFile: "Main.java",
      compile: (files) => [javac, "-J-Xmx384m", "-J-XX:+UseSerialGC", "-encoding", "UTF-8", ...withExt(files, ".java")],
      // The heap gets the problem's limit; the cgroup limit adds room for the JVM itself.
      run: (memoryLimitKb) => [java, `-Xmx${memoryLimitKb}k`, "-Xss64m", "-XX:+UseSerialGC", "-cp", ".", "Main"],
      processes: 64,
      memoryOverheadKb: 128 * 1024,
      dirs: tools.javaDirs,
    };
  }
  return specs;
}
