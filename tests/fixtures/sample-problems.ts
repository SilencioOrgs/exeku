import {
  matchesProblemFilter,
  summarizeProblems,
  toVisibleProblem,
  type ProblemFilter,
} from "@/lib/problems/catalog";
import type {
  ProblemSummary,
  ProgrammingProblem,
  VisibleProblem,
} from "@/types/problem";

/**
 * Sample problems used exclusively by unit tests for the judge pipeline,
 * hidden test redaction, and problem store locking.
 * Production PROBLEM_CATALOG is empty so no dummy problems appear in the app.
 */
export const SAMPLE_PROBLEMS: ProgrammingProblem[] = [
  {
    id: "hello-world",
    slug: "hello-world",
    title: "Hello World",
    description:
      "Welcome to Exeku! Write a program that prints the exact message 'Hello, Exeku!' to standard output followed by a newline.",
    difficulty: "beginner",
    category: "Syntax & Standard I/O",
    tags: ["basics", "io", "intro"],
    supportedLanguages: ["python", "java", "cpp", "c"],
    inputSpec: "There is no input for this problem.",
    outputSpec: "Print 'Hello, Exeku!' followed by a newline.",
    constraints: ["Output is case-sensitive.", "Exact punctuation is required."],
    sampleTestCases: [
      {
        input: "",
        output: "Hello, Exeku!\n",
        explanation: "The program should print the greeting message unconditionally.",
      },
    ],
    testCases: [
      {
        id: "hw-1",
        input: "",
        expectedOutput: "Hello, Exeku!\n",
        isHidden: false,
        explanation: "Standard greeting output check.",
      },
      {
        id: "hw-2",
        input: "",
        expectedOutput: "Hello, Exeku!\n",
        isHidden: true,
        explanation: "Deterministic hidden verification.",
      },
    ],
    timeLimitMs: 2000,
    memoryLimitKb: 128000,
    starterCodes: {
      python: `def main():\n    print("Hello, Exeku!")\n\nif __name__ == "__main__":\n    main()\n`,
      java: `public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, Exeku!");\n    }\n}\n`,
      cpp: `#include <iostream>\nint main() {\n    std::cout << "Hello, Exeku!" << std::endl;\n    return 0;\n}\n`,
      c: `#include <stdio.h>\nint main(void) {\n    printf("Hello, Exeku!\\n");\n    return 0;\n}\n`,
    },
  },
  {
    id: "sum-two-integers",
    slug: "sum-two-integers",
    title: "Sum of Two Integers",
    description:
      "Read two integers a and b from standard input, calculate their arithmetic sum, and print the resulting value.",
    difficulty: "beginner",
    category: "Arithmetic & Input",
    tags: ["math", "io", "arithmetic"],
    supportedLanguages: ["python", "java", "cpp", "c"],
    inputSpec: "A single line containing two space-separated integers, a and b.",
    outputSpec: "Print a single integer representing the sum of a and b.",
    constraints: ["-1000 <= a, b <= 1000"],
    sampleTestCases: [
      {
        input: "3 5",
        output: "8\n",
        explanation: "3 + 5 = 8",
      },
      {
        input: "-4 10",
        output: "6\n",
        explanation: "-4 + 10 = 6",
      },
    ],
    testCases: [
      {
        id: "sum-v1",
        input: "10 20",
        expectedOutput: "30\n",
        isHidden: false,
        explanation: "Positive integers sum.",
      },
      {
        id: "sum-v2",
        input: "-5 12",
        expectedOutput: "7\n",
        isHidden: false,
        explanation: "Mixed positive and negative values.",
      },
      {
        id: "sum-h1",
        input: "0 0",
        expectedOutput: "0\n",
        isHidden: true,
      },
      {
        id: "sum-h2",
        input: "-100 -250",
        expectedOutput: "-350\n",
        isHidden: true,
      },
      {
        id: "sum-h3",
        input: "1000 -1000",
        expectedOutput: "0\n",
        isHidden: true,
      },
    ],
    timeLimitMs: 2000,
    memoryLimitKb: 128000,
    starterCodes: {
      python: `import sys\n\ndef main():\n    tokens = sys.stdin.read().split()\n    if len(tokens) >= 2:\n        print(int(tokens[0]) + int(tokens[1]))\n\nif __name__ == "__main__":\n    main()\n`,
      java: `import java.util.Scanner;\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (sc.hasNextInt()) System.out.println(sc.nextInt() + sc.nextInt());\n    }\n}\n`,
      cpp: `#include <iostream>\nint main() {\n    int a, b;\n    if (std::cin >> a >> b) std::cout << (a + b) << std::endl;\n    return 0;\n}\n`,
      c: `#include <stdio.h>\nint main(void) {\n    int a, b;\n    if (scanf("%d %d", &a, &b) == 2) printf("%d\\n", a + b);\n    return 0;\n}\n`,
    },
  },
  {
    id: "even-or-odd",
    slug: "even-or-odd",
    title: "Even or Odd",
    description:
      "Given an integer n from standard input, determine whether it is even or odd. Print 'Even' if it is divisible by 2, otherwise print 'Odd'.",
    difficulty: "beginner",
    category: "Conditionals & Logic",
    tags: ["conditionals", "modulo", "logic"],
    supportedLanguages: ["python", "java", "cpp", "c"],
    inputSpec: "A single line containing an integer n.",
    outputSpec: "Print 'Even' or 'Odd' (case-sensitive) followed by a newline.",
    constraints: ["-10^6 <= n <= 10^6"],
    sampleTestCases: [
      {
        input: "4",
        output: "Even\n",
        explanation: "4 is divisible by 2 without a remainder.",
      },
      {
        input: "7",
        output: "Odd\n",
        explanation: "7 is not divisible by 2.",
      },
    ],
    testCases: [
      {
        id: "eo-v1",
        input: "12",
        expectedOutput: "Even\n",
        isHidden: false,
        explanation: "Positive even number check.",
      },
      {
        id: "eo-v2",
        input: "-3",
        expectedOutput: "Odd\n",
        isHidden: false,
        explanation: "Negative odd number check.",
      },
      {
        id: "eo-h1",
        input: "0",
        expectedOutput: "Even\n",
        isHidden: true,
        explanation: "Zero is an even integer.",
      },
      {
        id: "eo-h2",
        input: "-2",
        expectedOutput: "Even\n",
        isHidden: true,
      },
      {
        id: "eo-h3",
        input: "999999",
        expectedOutput: "Odd\n",
        isHidden: true,
      },
    ],
    timeLimitMs: 2000,
    memoryLimitKb: 128000,
    starterCodes: {
      python: `import sys\nn = int(sys.stdin.read().strip())\nprint("Even" if n % 2 == 0 else "Odd")\n`,
      java: `import java.util.Scanner;\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        System.out.println(sc.nextInt() % 2 == 0 ? "Even" : "Odd");\n    }\n}\n`,
      cpp: `#include <iostream>\nint main() {\n    int n;\n    if (std::cin >> n) std::cout << (n % 2 == 0 ? "Even" : "Odd") << std::endl;\n    return 0;\n}\n`,
      c: `#include <stdio.h>\nint main(void) {\n    int n;\n    if (scanf("%d", &n) == 1) printf("%s\\n", n % 2 == 0 ? "Even" : "Odd");\n    return 0;\n}\n`,
    },
  },
];

export function getAllProblems(): ProgrammingProblem[] {
  return [...SAMPLE_PROBLEMS];
}

export function getProblemById(id: string): ProgrammingProblem | null {
  return SAMPLE_PROBLEMS.find((p) => p.id === id || p.slug === id) || null;
}

export function getVisibleProblem(id: string): VisibleProblem | null {
  const full = getProblemById(id);
  return full ? toVisibleProblem(full) : null;
}

export function getProblemSummaries(filter?: ProblemFilter): ProblemSummary[] {
  return summarizeProblems(SAMPLE_PROBLEMS, filter);
}

export { matchesProblemFilter, toVisibleProblem, summarizeProblems };
