import type { PreferredLanguage } from "@/types/profile";

export const ALL_SUPPORTED_LANGUAGES: PreferredLanguage[] = [
  "python",
  "java",
  "cpp",
  "c",
];

export const LANGUAGE_DISPLAY_NAMES: Record<PreferredLanguage, string> = {
  python: "Python 3",
  java: "Java",
  cpp: "C++",
  c: "C",
};

export function getFilenameForLanguage(lang: PreferredLanguage): string {
  switch (lang) {
    case "python":
      return "main.py";
    case "java":
      return "Main.java";
    case "cpp":
      return "main.cpp";
    case "c":
      return "main.c";
  }
}

export function getMonacoLanguage(lang: PreferredLanguage): string {
  switch (lang) {
    case "python":
      return "python";
    case "java":
      return "java";
    case "cpp":
      return "cpp";
    case "c":
      return "c";
  }
}

export function getStarterCode(lang: PreferredLanguage): string {
  switch (lang) {
    case "python":
      return `# Exeku Python 3 Workspace
# Your Code. Your Machine.

def main():
    print("Hello, Exeku!")

if __name__ == "__main__":
    main()
`;
    case "java":
      return `// Exeku Java Workspace
// Your Code. Your Machine.

public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, Exeku!");
    }
}
`;
    case "cpp":
      return `// Exeku C++ Workspace
// Your Code. Your Machine.

#include <iostream>

int main() {
    std::cout << "Hello, Exeku!" << std::endl;
    return 0;
}
`;
    case "c":
      return `/* Exeku C Workspace */
/* Your Code. Your Machine. */

#include <stdio.h>

int main(void) {
    printf("Hello, Exeku!\\n");
    return 0;
}
`;
  }
}
