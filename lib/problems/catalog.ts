import {
  type ProgrammingProblem,
  type VisibleProblem,
  type ProblemSummary,
} from "@/types/problem";

export const PROBLEM_CATALOG: ProgrammingProblem[] = [
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
      python: `# Exeku Problem: Hello World
# Output exact text: Hello, Exeku!

def main():
    print("Hello, Exeku!")

if __name__ == "__main__":
    main()
`,
      java: `// Exeku Problem: Hello World
// Output exact text: Hello, Exeku!

public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, Exeku!");
    }
}
`,
      cpp: `// Exeku Problem: Hello World
// Output exact text: Hello, Exeku!

#include <iostream>

int main() {
    std::cout << "Hello, Exeku!" << std::endl;
    return 0;
}
`,
      c: `/* Exeku Problem: Hello World */
/* Output exact text: Hello, Exeku! */

#include <stdio.h>

int main(void) {
    printf("Hello, Exeku!\\n");
    return 0;
}
`,
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
      python: `# Exeku Problem: Sum of Two Integers
# Read two integers from standard input and print their sum.
import sys

def main():
    tokens = sys.stdin.read().split()
    if len(tokens) >= 2:
        a = int(tokens[0])
        b = int(tokens[1])
        print(a + b)

if __name__ == "__main__":
    main()
`,
      java: `// Exeku Problem: Sum of Two Integers
import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (sc.hasNextInt()) {
            int a = sc.nextInt();
            int b = sc.nextInt();
            System.out.println(a + b);
        }
    }
}
`,
      cpp: `// Exeku Problem: Sum of Two Integers
#include <iostream>

int main() {
    int a, b;
    if (std::cin >> a >> b) {
        std::cout << (a + b) << std::endl;
    }
    return 0;
}
`,
      c: `/* Exeku Problem: Sum of Two Integers */
#include <stdio.h>

int main(void) {
    int a, b;
    if (scanf("%d %d", &a, &b) == 2) {
        printf("%d\\n", a + b);
    }
    return 0;
}
`,
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
      python: `# Exeku Problem: Even or Odd
import sys

def main():
    token = sys.stdin.read().strip()
    if token:
        n = int(token)
        if n % 2 == 0:
            print("Even")
        else:
            print("Odd")

if __name__ == "__main__":
    main()
`,
      java: `// Exeku Problem: Even or Odd
import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (sc.hasNextInt()) {
            int n = sc.nextInt();
            if (n % 2 == 0) {
                System.out.println("Even");
            } else {
                System.out.println("Odd");
            }
        }
    }
}
`,
      cpp: `// Exeku Problem: Even or Odd
#include <iostream>

int main() {
    int n;
    if (std::cin >> n) {
        if (n % 2 == 0) {
            std::cout << "Even" << std::endl;
        } else {
            std::cout << "Odd" << std::endl;
        }
    }
    return 0;
}
`,
      c: `/* Exeku Problem: Even or Odd */
#include <stdio.h>

int main(void) {
    int n;
    if (scanf("%d", &n) == 1) {
        if (n % 2 == 0) {
            printf("Even\\n");
        } else {
            printf("Odd\\n");
        }
    }
    return 0;
}
`,
    },
  },
];

export function getAllProblems(): ProgrammingProblem[] {
  return [...PROBLEM_CATALOG];
}

export function getProblemById(id: string): ProgrammingProblem | null {
  return PROBLEM_CATALOG.find((p) => p.id === id || p.slug === id) || null;
}

export function getVisibleProblem(id: string): VisibleProblem | null {
  const full = getProblemById(id);
  if (!full) return null;

  return {
    id: full.id,
    slug: full.slug,
    title: full.title,
    description: full.description,
    difficulty: full.difficulty,
    category: full.category,
    tags: full.tags,
    supportedLanguages: full.supportedLanguages,
    inputSpec: full.inputSpec,
    outputSpec: full.outputSpec,
    constraints: full.constraints,
    sampleTestCases: full.sampleTestCases,
    visibleTestCases: full.testCases
      .filter((t) => !t.isHidden)
      .map((t) => ({
        id: t.id,
        input: t.input,
        expectedOutput: t.expectedOutput,
        explanation: t.explanation,
      })),
    timeLimitMs: full.timeLimitMs,
    memoryLimitKb: full.memoryLimitKb,
    starterCodes: full.starterCodes,
  };
}

export function getProblemSummaries(filter?: {
  difficulty?: string;
  language?: string;
  search?: string;
}): ProblemSummary[] {
  return PROBLEM_CATALOG.filter((p) => {
    if (filter?.difficulty && filter.difficulty !== "all") {
      if (p.difficulty !== filter.difficulty) return false;
    }
    if (filter?.language) {
      if (!p.supportedLanguages.includes(filter.language as never)) return false;
    }
    if (filter?.search) {
      const q = filter.search.toLowerCase();
      const matchTitle = p.title.toLowerCase().includes(q);
      const matchCategory = p.category.toLowerCase().includes(q);
      const matchTags = p.tags.some((t) => t.toLowerCase().includes(q));
      if (!matchTitle && !matchCategory && !matchTags) return false;
    }
    return true;
  }).map((p) => ({
    id: p.id,
    slug: p.slug,
    title: p.title,
    difficulty: p.difficulty,
    category: p.category,
    tags: p.tags,
    supportedLanguages: p.supportedLanguages,
    sampleCount: p.sampleTestCases.length,
    totalTestsCount: p.testCases.length,
  }));
}
