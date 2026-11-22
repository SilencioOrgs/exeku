import type { LearnChapterId } from "@/lib/learn/curriculum";
import type { PreferredLanguage } from "@/types/profile";

export type LanguageDocTopicId =
  | "program-structure"
  | "types-operators"
  | "standard-io"
  | "arrays-collections"
  | "strings-chars"
  | "sorting-searching"
  | "maps-sets"
  | "functions-recursion";

export interface DocReferenceRow {
  syntax: string;
  description: string;
  notes: string;
}

export interface LanguageDocSection {
  title: string;
  overview: string;
  referenceTable: DocReferenceRow[];
  codeSnippet: string;
  pitfalls: string[];
}

export interface LanguageDocTopic {
  id: LanguageDocTopicId;
  order: string;
  title: string;
  shortTitle: string;
  category: string;
  tags: string[];
  relatedChapterId: LearnChapterId;
  summary: string;
  byLanguage: Record<PreferredLanguage, LanguageDocSection>;
}

export const LANGUAGE_OVERVIEW_META: Record<
  PreferredLanguage,
  {
    version: string;
    entryFile: string;
    compileCommand: string;
    paradigm: string;
    summary: string;
  }
> = {
  python: {
    version: "Python 3.11+",
    entryFile: "main.py",
    compileCommand: "python3 main.py",
    paradigm: "Interpreted · Dynamic typing · Indentation blocks",
    summary:
      "Concise, readable syntax with built-in arbitrary-precision integers, dynamic lists, slices, and hash dictionaries.",
  },
  java: {
    version: "OpenJDK 17+",
    entryFile: "Main.java",
    compileCommand: "javac Main.java && java Main",
    paradigm: "Compiled bytecode · Static typing · Class-based OOP",
    summary:
      "Strongly typed object-oriented language with java.util collections (Arrays, ArrayList, HashMap) and Scanner / BufferedReader I/O.",
  },
  cpp: {
    version: "C++20 (g++)",
    entryFile: "main.cpp",
    compileCommand: "g++ -O2 -std=c++20 main.cpp -o main",
    paradigm: "Ahead-of-time compiled · Static typing · STL containers & algorithms",
    summary:
      "High-performance systems and competitive programming language with the Standard Template Library (std::vector, std::string, std::sort, std::unordered_map).",
  },
  c: {
    version: "C17 (gcc)",
    entryFile: "main.c",
    compileCommand: "gcc -O2 -std=c17 main.c -lm -o main",
    paradigm: "Ahead-of-time compiled · Procedural · Manual memory & pointers",
    summary:
      "Low-level procedural language with fast formatted I/O (scanf / printf), contiguous arrays, pointers, and <string.h> / <stdlib.h> utilities.",
  },
};

export const LANGUAGE_DOC_TOPICS: LanguageDocTopic[] = [
  {
    id: "program-structure",
    order: "01",
    title: "Program Structure & Entry Point",
    shortTitle: "Program Structure",
    category: "Core Language",
    tags: ["syntax", "main", "headers", "imports", "structure"],
    relatedChapterId: "syntax-output",
    summary: "How files, imports/headers, main entry points, and comments are structured in each language.",
    byLanguage: {
      python: {
        title: "Python 3 Program Structure",
        overview:
          "Python scripts run top-to-bottom starting at line 1 of main.py. Code blocks (loops, conditionals, functions) are defined by 4-space indentation rather than curly braces.",
        referenceTable: [
          { syntax: "# comment", description: "Single-line comment ignored by Python", notes: "Use for inline notes" },
          { syntax: "import sys, math", description: "Import standard library modules", notes: "Place at top of file" },
          { syntax: 'if __name__ == "__main__":', description: "Optional script entry guard", notes: "Top-level code also runs directly" },
          { syntax: "print(x, y)", description: "Write values to standard output", notes: "Appends newline by default" },
        ],
        codeSnippet: `import sys
import math

def solve():
    # Entry logic inside a helper function
    radius = 5
    area = math.pi * (radius ** 2)
    print(f"Area: {area:.2f}")

if __name__ == "__main__":
    solve()`,
        pitfalls: [
          "Never mix tabs and spaces in indentation — always use 4 spaces per level.",
          "Python is case-sensitive: Print() or True/False with lowercase true/false will raise a NameError.",
        ],
      },
      java: {
        title: "Java Program Structure (class Main)",
        overview:
          "In Exeku, Java submissions run from Main.java. Your entry class must be named public class Main and define public static void main(String[] args).",
        referenceTable: [
          { syntax: "import java.util.*;", description: "Import Scanner, Arrays, List, Map, Set", notes: "Must appear above class Main" },
          { syntax: "public class Main", description: "Required top-level class name", notes: "Matches Main.java filename" },
          { syntax: "public static void main(String[] args)", description: "Program entry point executed by JVM", notes: "Required exact signature" },
          { syntax: "// comment  or  /* ... */", description: "Single-line or multi-line comment", notes: "Ignored by javac" },
        ],
        codeSnippet: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        System.out.println("Java environment ready.");
    }
}`,
        pitfalls: [
          "Naming the public class Solution or Program instead of Main will cause a compilation error.",
          "Every statement must end with a semicolon (;), and every opening brace { must have a matching }.",
        ],
      },
      cpp: {
        title: "C++20 Program Structure",
        overview:
          "C++ programs include standard headers with #include and begin execution inside int main(). Returning 0 from main() indicates normal completion.",
        referenceTable: [
          { syntax: "#include <iostream>", description: "Provides std::cin, std::cout, std::endl", notes: "No semicolon after #include" },
          { syntax: "#include <vector> / <string> / <algorithm>", description: "Core STL containers and algorithms", notes: "Include what you use" },
          { syntax: "int main() { ... return 0; }", description: "Standard C++ program entry point", notes: "Returns exit code 0" },
          { syntax: "std::ios::sync_with_stdio(false);", description: "Speeds up C++ cin/cout I/O", notes: "Pair with std::cin.tie(nullptr);" },
        ],
        codeSnippet: `#include <algorithm>
#include <iostream>
#include <string>
#include <vector>

int main() {
    std::ios::sync_with_stdio(false);
    std::cin.tie(nullptr);

    std::cout << "C++20 ready\\n";
    return 0;
}`,
        pitfalls: [
          "Prefer '\\n' over std::endl inside loops because std::endl flushes the output buffer on every line and can cause Time Limit Exceeded.",
          "If you enable sync_with_stdio(false), do not mix std::cout with C's printf.",
        ],
      },
      c: {
        title: "C17 Program Structure",
        overview:
          "C programs include header declarations with #include <stdio.h> and start inside int main(void). Standard library headers provide I/O, memory, math, and string utilities.",
        referenceTable: [
          { syntax: "#include <stdio.h>", description: "Standard I/O: printf, scanf, fgets, putchar", notes: "Required for console I/O" },
          { syntax: "#include <stdlib.h>", description: "malloc, free, qsort, abs, llabs", notes: "Memory & sorting utilities" },
          { syntax: "#include <string.h>", description: "strlen, strcmp, strcpy, memset, memcpy", notes: "Null-terminated string helpers" },
          { syntax: "#include <stdbool.h> / <limits.h>", description: "bool, true, false, INT_MAX, LLONG_MAX", notes: "C99/C17 types and constants" },
        ],
        codeSnippet: `#include <stdbool.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

int main(void) {
    printf("C17 environment ready\\n");
    return 0;
}`,
        pitfalls: [
          "Always return 0 from main(void) so the sandbox records exit code 0 (SUCCESS).",
          "Local variables and arrays in C are not zero-initialized automatically — initialize them explicitly.",
        ],
      },
    },
  },
  {
    id: "types-operators",
    order: "02",
    title: "Data Types, Ranges & Operators",
    shortTitle: "Types & Operators",
    category: "Core Language",
    tags: ["types", "int", "long", "float", "operators", "modulo", "overflow"],
    relatedChapterId: "variables-types",
    summary: "Primitive types, 32-bit vs 64-bit integer limits, division rules, and type conversion.",
    byLanguage: {
      python: {
        title: "Python Data Types & Arithmetic Operators",
        overview:
          "Python integers (int) have arbitrary precision and never overflow 32-bit or 64-bit bounds. Watch the difference between true division (/) and floor division (//).",
        referenceTable: [
          { syntax: "int (e.g. 42, 10**18)", description: "Arbitrary-precision whole number", notes: "No 64-bit overflow" },
          { syntax: "float (e.g. 3.14)", description: "64-bit IEEE 754 floating-point number", notes: "~15-17 decimal digits of precision" },
          { syntax: "a // b  vs  a / b", description: "// is floor (integer) division; / returns float", notes: "7 // 2 == 3, 7 / 2 == 3.5" },
          { syntax: "a % b  and  a ** b", description: "Modulo remainder and exponentiation", notes: "pow(a, b, mod) for modular power" },
          { syntax: "int(s), float(s), str(x)", description: "Explicit type conversions", notes: "int('42') -> 42" },
        ],
        codeSnippet: `a, b = 17, 5
print("Floor div:", a // b)      # 3
print("Float div:", a / b)       # 3.4
print("Remainder:", a % b)       # 2
print("Power:", 2 ** 10)         # 1024
print("Big int:", 10 ** 30 + 7)  # Exact`,
        pitfalls: [
          "Using / instead of // when computing an array midpoint (mid = (lo + hi) // 2) produces a float and raises TypeError on list indexing.",
          "In Python, negative floor division rounds toward -infinity (-7 // 2 == -4).",
        ],
      },
      java: {
        title: "Java Primitive Types & 64-Bit Overflow",
        overview:
          "Java's int is a signed 32-bit integer (-2.14e9 to 2.14e9). Whenever a sum or product can exceed 2,147,483,647, use long (64-bit, up to 9.22e18).",
        referenceTable: [
          { syntax: "int", description: "32-bit signed integer (-2^31 to 2^31 - 1)", notes: "Max ~2.14 × 10^9" },
          { syntax: "long", description: "64-bit signed integer (-2^63 to 2^63 - 1)", notes: "Max ~9.22 × 10^18 (use 0L literals)" },
          { syntax: "double", description: "64-bit floating-point decimal", notes: "Prefer double over float" },
          { syntax: "boolean / char", description: "true or false / 16-bit UTF-16 character", notes: "Single quotes 'a' for char" },
          { syntax: "Integer.parseInt(s) / Long.parseLong(s)", description: "Parse String into int or long", notes: "String.valueOf(x) for reverse" },
        ],
        codeSnippet: `public class Main {
    public static void main(String[] args) {
        int a = 1_000_000_000;
        int b = 1_000_000_000;
        // Cast to long BEFORE multiplying or adding beyond 2^31 - 1
        long sum = (long) a + b;
        long prod = (long) a * b;
        System.out.println("Sum: " + sum);
        System.out.println("Product: " + prod);
    }
}`,
        pitfalls: [
          "Writing long prod = a * b; when a and b are int overflows in 32-bit arithmetic BEFORE being stored in prod! Write (long) a * b.",
          "In Java, integer division 7 / 2 truncates toward zero (equals 3). Cast to (double) 7 / 2 for 3.5.",
        ],
      },
      cpp: {
        title: "C++ Fundamental Types & Integer Limits",
        overview:
          "In C++, int is 32-bit (up to ~2.14e9) and long long is 64-bit (up to ~9.22e18). Use LL suffixes on large integer constants (e.g., 10000000000LL).",
        referenceTable: [
          { syntax: "int", description: "32-bit signed integer", notes: "-2,147,483,648 to 2,147,483,647" },
          { syntax: "long long", description: "64-bit signed integer", notes: "Up to ~9.22 × 10^18" },
          { syntax: "double / long double", description: "64-bit / extended floating-point", notes: "Include <iomanip> for setprecision" },
          { syntax: "bool / char", description: "Boolean (true/false) and 8-bit character", notes: "'a' - 'a' == 0" },
          { syntax: "std::stoi(s), std::stoll(s), std::to_string(x)", description: "Convert between std::string and numbers", notes: "From <string>" },
        ],
        codeSnippet: `#include <climits>
#include <iostream>

int main() {
    int max32 = INT_MAX;
    long long big = 1LL * max32 + 1000;
    std::cout << "INT_MAX: " << max32 << '\\n';
    std::cout << "64-bit sum: " << big << '\\n';
    return 0;
}`,
        pitfalls: [
          "Multiplying two int variables overflows before assignment to long long — multiply by 1LL first: 1LL * a * b.",
          "v.size() returns an unsigned size_t; subtracting 1 from an empty vector's size() wraps around to a huge unsigned number.",
        ],
      },
      c: {
        title: "C Numeric Types & Format Specifiers",
        overview:
          "In C, pair every numeric type with its exact printf / scanf format specifier: %d for int, %lld for long long, and %lf (scanf) / %f (printf) for double.",
        referenceTable: [
          { syntax: "int  (%d)", description: "32-bit signed integer", notes: "<limits.h> defines INT_MAX, INT_MIN" },
          { syntax: "long long  (%lld)", description: "64-bit signed integer", notes: "LLONG_MAX is ~9.22 × 10^18" },
          { syntax: "double  (%lf in scanf, %f in printf)", description: "64-bit floating-point number", notes: "Use %.2f to print 2 decimal places" },
          { syntax: "char  (%c)", description: "Single byte character", notes: "Use \" %c\" in scanf to skip whitespace" },
          { syntax: "atoll(s), strtoll(s, NULL, 10)", description: "Parse string to long long", notes: "From <stdlib.h>" },
        ],
        codeSnippet: `#include <limits.h>
#include <stdio.h>

int main(void) {
    long long a = 1000000000LL;
    long long b = 2000000000LL;
    printf("Sum: %lld\\n", a + b);
    printf("Ratio: %.3f\\n", (double)a / (double)b);
    return 0;
}`,
        pitfalls: [
          "Using %d to print or scan a long long causes undefined behavior and wrong output — always use %lld.",
          "In scanf, double requires %lf (not %f, which is for 32-bit float).",
        ],
      },
    },
  },
  {
    id: "standard-io",
    order: "03",
    title: "Standard Input & Output (stdin / stdout)",
    shortTitle: "Standard I/O",
    category: "Input / Output",
    tags: ["stdin", "stdout", "input", "output", "scanner", "cin", "scanf", "print"],
    relatedChapterId: "user-input",
    summary: "Patterns for reading single integers, multi-number lines, N-element arrays, and EOF streams in automated judges.",
    byLanguage: {
      python: {
        title: "Python Standard I/O Patterns",
        overview:
          "Use input() to read one line at a time, or sys.stdin.read().split() to load all whitespace-separated tokens at once when input can span multiple lines.",
        referenceTable: [
          { syntax: "s = input().strip()", description: "Read one line without trailing newline", notes: "Never pass a prompt string to input()" },
          { syntax: "n = int(input())", description: "Read a single integer on its own line", notes: "Raises ValueError if line has spaces" },
          { syntax: "a, b = map(int, input().split())", description: "Read two space-separated integers", notes: "Works for any fixed count" },
          { syntax: "nums = list(map(int, input().split()))", description: "Read a line of integers into a list", notes: "Fastest 1-line array read" },
          { syntax: "tokens = sys.stdin.read().split()", description: "Read all tokens from stdin until EOF", notes: "Best when line breaks vary" },
        ],
        codeSnippet: `import sys

# Pattern: First token is N, followed by N integers
tokens = sys.stdin.read().split()
if tokens:
    n = int(tokens[0])
    arr = [int(x) for x in tokens[1:1 + n]]
    print(sum(arr))`,
        pitfalls: [
          "Calling input('Enter N: ') prints 'Enter N: ' to stdout, which will fail every automated judge test case with Wrong Answer.",
          "When N is 10^5 and integers are spread across multiple lines, sys.stdin.read().split() is safer and faster than calling input() in a loop.",
        ],
      },
      java: {
        title: "Java Scanner & Fast I/O Patterns",
        overview:
          "Use java.util.Scanner for clean token-based input (nextInt(), nextLong(), next()), or BufferedReader + StringTokenizer for large inputs.",
        referenceTable: [
          { syntax: "sc.nextInt() / sc.nextLong()", description: "Read next 32-bit or 64-bit integer token", notes: "Skips spaces and newlines" },
          { syntax: "sc.next()", description: "Read next whitespace-delimited word", notes: "Does not include spaces" },
          { syntax: "sc.nextLine()", description: "Read remainder of the current line", notes: "Consume leftover newline after nextInt()" },
          { syntax: "sc.hasNextInt()", description: "Check if another int token exists before EOF", notes: "Useful for multi-case inputs" },
          { syntax: "System.out.printf(\"%.2f%n\", val)", description: "Print formatted decimal with newline", notes: "%n is platform newline" },
        ],
        codeSnippet: `import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (!sc.hasNextInt()) return;
        int n = sc.nextInt();
        long sum = 0;
        for (int i = 0; i < n; i++) {
            sum += sc.nextLong();
        }
        System.out.println(sum);
    }
}`,
        pitfalls: [
          "Calling sc.nextLine() immediately after sc.nextInt() reads the empty newline character left behind by nextInt(). Call sc.nextLine() once to consume the newline first.",
        ],
      },
      cpp: {
        title: "C++ std::cin / std::cout & getline",
        overview:
          "The >> operator on std::cin automatically skips any amount of whitespace (spaces, tabs, newlines). Use std::getline(std::cin, s) when spaces inside a line matter.",
        referenceTable: [
          { syntax: "std::cin >> a >> b;", description: "Read two whitespace-separated values", notes: "Works across spaces or newlines" },
          { syntax: "while (std::cin >> x) { ... }", description: "Read tokens until End-Of-File (EOF)", notes: "Standard stream loop" },
          { syntax: "std::getline(std::cin >> std::ws, line);", description: "Read a full line after skipping leading newline", notes: "std::ws consumes leftover '\\n'" },
          { syntax: "std::cout << std::fixed << std::setprecision(2) << d;", description: "Print float with exact decimal places", notes: "Requires <iomanip>" },
        ],
        codeSnippet: `#include <iomanip>
#include <iostream>
#include <vector>

int main() {
    int n;
    if (!(std::cin >> n)) return 0;
    long long sum = 0;
    for (int i = 0; i < n; i++) {
        long long x;
        std::cin >> x;
        sum += x;
    }
    std::cout << sum << '\\n';
    return 0;
}`,
        pitfalls: [
          "When mixing std::cin >> n and std::getline(std::cin, s), use std::getline(std::cin >> std::ws, s) so the trailing newline after n is skipped.",
        ],
      },
      c: {
        title: "C scanf / printf & EOF Loops",
        overview:
          "In C, scanf returns the count of items successfully matched. Always pass the address of numeric variables with & (e.g., &n), while char arrays pass their name directly.",
        referenceTable: [
          { syntax: "scanf(\"%d %d\", &a, &b)", description: "Read two 32-bit integers", notes: "Returns 2 on success" },
          { syntax: "scanf(\"%lld\", &x)", description: "Read a 64-bit long long integer", notes: "Remember the & address operator" },
          { syntax: "scanf(\"%s\", word)", description: "Read a whitespace-delimited word into char[]", notes: "No & needed for char array" },
          { syntax: "while (scanf(\"%d\", &x) == 1)", description: "Read integers until EOF", notes: "Stops cleanly at end of input" },
          { syntax: "printf(\"%.2f\\n\", val)", description: "Print double rounded to 2 decimal places", notes: "Include \\n at end of line" },
        ],
        codeSnippet: `#include <stdio.h>

int main(void) {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    long long sum = 0;
    for (int i = 0; i < n; i++) {
        long long x;
        scanf("%lld", &x);
        sum += x;
    }
    printf("%lld\\n", sum);
    return 0;
}`,
        pitfalls: [
          "Forgetting the & in scanf(\"%d\", n) causes a segmentation fault (Runtime Error) because scanf tries to write to memory address n.",
        ],
      },
    },
  },
  {
    id: "arrays-collections",
    order: "04",
    title: "Arrays, Lists & Dynamic Vectors",
    shortTitle: "Arrays & Vectors",
    category: "Data Structures",
    tags: ["array", "arrays", "list", "vector", "indexing", "slicing", "printing"],
    relatedChapterId: "printing-arrays",
    summary: "Creating, indexing, resizing, slicing, traversing, and printing 1D and 2D arrays.",
    byLanguage: {
      python: {
        title: "Python Lists (Dynamic Arrays)",
        overview:
          "Python lists are dynamic arrays supporting O(1) indexing, negative indexing from the end, O(1) append/pop at the tail, list comprehensions, and unpacking with *.",
        referenceTable: [
          { syntax: "arr = [0] * n", description: "Create a list of length n filled with 0", notes: "O(n) initialization" },
          { syntax: "arr[0], arr[-1]", description: "First element and last element", notes: "0-based indexing" },
          { syntax: "arr.append(x) / arr.pop()", description: "Push to end / remove from end", notes: "Amortized O(1)" },
          { syntax: "arr[a:b] / arr[::-1]", description: "Sublist from index a to b-1 / reversed copy", notes: "Slicing creates a new list" },
          { syntax: "print(*arr)", description: "Print all elements space-separated on one line", notes: "print(*arr, sep=', ') for custom separator" },
        ],
        codeSnippet: `nums = [10, 20, 30, 40]
nums.append(50)

print("Length:", len(nums))
print("First & Last:", nums[0], nums[-1])
print("Middle slice:", nums[1:4])
print("Space-separated:", *nums)`,
        pitfalls: [
          "Never create a 2D grid with grid = [[0] * cols] * rows because every row references the exact same inner list! Use [[0] * cols for _ in range(rows)].",
        ],
      },
      java: {
        title: "Java Arrays (int[]) & ArrayList",
        overview:
          "Use fixed-size primitive arrays (int[], long[]) when the length N is known up front, or ArrayList<Integer> when elements are added dynamically.",
        referenceTable: [
          { syntax: "int[] arr = new int[n];", description: "Allocate zero-initialized array of length n", notes: "arr.length is the element count" },
          { syntax: "Arrays.toString(arr)", description: "Format array as \"[10, 20, 30]\"", notes: "From java.util.Arrays" },
          { syntax: "Arrays.fill(arr, -1);", description: "Fill all slots with a constant value", notes: "O(n)" },
          { syntax: "List<Integer> list = new ArrayList<>();", description: "Dynamic resizable list", notes: "list.add(x), list.get(i), list.size()" },
        ],
        codeSnippet: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        int[] arr = {10, 20, 30, 40, 50};
        for (int i = 0; i < arr.length; i++) {
            System.out.print(arr[i] + (i + 1 < arr.length ? " " : "\\n"));
        }

        List<Integer> dynamic = new ArrayList<>();
        dynamic.add(100);
        dynamic.add(200);
        System.out.println("ArrayList size: " + dynamic.size());
    }
}`,
        pitfalls: [
          "Arrays use arr.length (a field), Strings use s.length() (a method), and ArrayLists use list.size() (a method).",
        ],
      },
      cpp: {
        title: "C++ std::vector<T>",
        overview:
          "std::vector<T> from <vector> is C++'s dynamic array. It manages memory automatically, supports O(1) random access, and can be sized at runtime.",
        referenceTable: [
          { syntax: "std::vector<int> v(n, 0);", description: "Vector of size n initialized to 0", notes: "O(n)" },
          { syntax: "v.push_back(x) / v.pop_back()", description: "Append element to end / remove last element", notes: "Amortized O(1)" },
          { syntax: "v.size() / v.empty()", description: "Element count / true if size is 0", notes: "Cast (int)v.size() for signed math" },
          { syntax: "v.front() / v.back()", description: "First element / last element", notes: "Requires non-empty vector" },
          { syntax: "std::vector<std::vector<int>> grid(r, std::vector<int>(c, 0));", description: "2D r × c matrix initialized to 0", notes: "grid[i][j] access" },
        ],
        codeSnippet: `#include <iostream>
#include <vector>

int main() {
    std::vector<int> v = {10, 20, 30, 40};
    v.push_back(50);

    for (std::size_t i = 0; i < v.size(); i++) {
        std::cout << v[i] << (i + 1 < v.size() ? ' ' : '\\n');
    }
    return 0;
}`,
        pitfalls: [
          "Accessing v[i] when i >= v.size() is out-of-bounds undefined behavior and can crash with Runtime Error.",
        ],
      },
      c: {
        title: "C Contiguous Arrays & Dynamic Allocation",
        overview:
          "In C, declare fixed arrays or allocate dynamic arrays on the heap with malloc / calloc from <stdlib.h> when N is large (e.g. N = 10^5).",
        referenceTable: [
          { syntax: "int arr[100] = {0};", description: "Zero-initialized fixed array of 100 ints", notes: "Indices 0 to 99" },
          { syntax: "sizeof(arr) / sizeof(arr[0])", description: "Element count of a local stack array", notes: "Does NOT work on pointer parameters" },
          { syntax: "int *arr = malloc(n * sizeof(int));", description: "Allocate dynamic array of n ints on heap", notes: "Call free(arr) when done" },
          { syntax: "int *arr = calloc(n, sizeof(int));", description: "Allocate zero-initialized array of n ints", notes: "From <stdlib.h>" },
        ],
        codeSnippet: `#include <stdio.h>
#include <stdlib.h>

int main(void) {
    int n = 5;
    int *arr = (int *)malloc((size_t)n * sizeof(int));
    if (!arr) return 1;

    for (int i = 0; i < n; i++) arr[i] = (i + 1) * 10;
    for (int i = 0; i < n; i++) {
        printf("%d%c", arr[i], i + 1 < n ? ' ' : '\\n');
    }
    free(arr);
    return 0;
}`,
        pitfalls: [
          "Avoid allocating huge arrays (like int a[1000000]) as local stack variables — allocate them with malloc/calloc or declare them at file scope so you don't overflow the stack.",
        ],
      },
    },
  },
  {
    id: "strings-chars",
    order: "05",
    title: "Strings & Character Methods",
    shortTitle: "Strings & Chars",
    category: "Data Structures",
    tags: ["string", "strings", "char", "substring", "ascii", "reverse", "split"],
    relatedChapterId: "strings",
    summary: "String indexing, substrings, case conversion, character ASCII codes, and string building.",
    byLanguage: {
      python: {
        title: "Python str & Character Operations",
        overview:
          "Python strings are immutable sequences of Unicode characters. Use slices for substrings, ''.join(list) to build strings in O(N), and ord(c) / chr(x) for ASCII math.",
        referenceTable: [
          { syntax: "len(s), s[i], s[a:b]", description: "Length, character at i, substring [a, b)", notes: "s[::-1] reverses the string" },
          { syntax: "s.lower(), s.upper()", description: "Convert to lowercase or uppercase", notes: "s.isalpha(), s.isdigit()" },
          { syntax: "s.split() / ' '.join(words)", description: "Split into list of tokens / join list into str", notes: "O(N) string concatenation" },
          { syntax: "ord(c) / chr(code)", description: "Character to ASCII integer / integer to char", notes: "ord('a') == 97, ord('A') == 65" },
        ],
        codeSnippet: `s = "ExekuPlatform"
print("Lower:", s.lower())
print("Prefix:", s[:5])
print("Reversed:", s[::-1])
print("Alphabet index of 'c':", ord('c') - ord('a'))`,
        pitfalls: [
          "Python strings cannot be modified in place (s[0] = 'x' raises TypeError). Convert to a list of chars first: chars = list(s).",
        ],
      },
      java: {
        title: "Java String, Character & StringBuilder",
        overview:
          "Java Strings are immutable objects. Always use s.charAt(i) to inspect characters, s1.equals(s2) to compare strings, and StringBuilder when modifying or reversing strings.",
        referenceTable: [
          { syntax: "s.length() / s.charAt(i)", description: "Character count / char at 0-based index i", notes: "O(1)" },
          { syntax: "s.substring(a, b)", description: "Substring from index a (inclusive) to b (exclusive)", notes: "b - a characters long" },
          { syntax: "s1.equals(s2)", description: "Compare two strings for exact content equality", notes: "Never use == on Strings" },
          { syntax: "s.toCharArray()", description: "Convert String to mutable char[] array", notes: "Great for sorting or swapping chars" },
          { syntax: "new StringBuilder(s).reverse().toString()", description: "Reverse or append characters in O(N)", notes: "sb.append(ch)" },
        ],
        codeSnippet: `public class Main {
    public static void main(String[] args) {
        String s = "ExekuPlatform";
        System.out.println("Lower: " + s.toLowerCase());
        System.out.println("Prefix: " + s.substring(0, 5));
        System.out.println("Reversed: " + new StringBuilder(s).reverse());
    }
}`,
        pitfalls: [
          "Appending to a String with s += ch inside a large loop takes O(N^2) time and causes Time Limit Exceeded — use StringBuilder.append(ch) instead.",
        ],
      },
      cpp: {
        title: "C++ std::string & <cctype>",
        overview:
          "C++ std::string is mutable, so you can modify characters in place (s[i] = 'a'), append in amortized O(1) with s += ch, and sort or reverse with <algorithm>.",
        referenceTable: [
          { syntax: "s.size() / s[i]", description: "Length of string / mutable char at index i", notes: "O(1)" },
          { syntax: "s.substr(pos, len)", description: "Substring starting at pos of length len", notes: "Second argument is length, NOT end index!" },
          { syntax: "std::reverse(s.begin(), s.end())", description: "Reverse string in place", notes: "From <algorithm>" },
          { syntax: "std::tolower(c), std::isdigit(c), std::isalpha(c)", description: "Character classification & case helpers", notes: "From <cctype>" },
        ],
        codeSnippet: `#include <algorithm>
#include <iostream>
#include <string>

int main() {
    std::string s = "ExekuPlatform";
    std::cout << "Prefix: " << s.substr(0, 5) << '\\n';
    std::reverse(s.begin(), s.end());
    std::cout << "Reversed: " << s << '\\n';
    return 0;
}`,
        pitfalls: [
          "In C++, s.substr(start, length) takes a LENGTH as its second argument, unlike Python s[a:b] and Java s.substring(a, b) which take an end index!",
        ],
      },
      c: {
        title: "C Null-Terminated Strings (<string.h>)",
        overview:
          "C strings are char arrays terminated by a '\\0' byte. Allocate size N + 1 for a string of max length N so there is always room for '\\0'.",
        referenceTable: [
          { syntax: "strlen(s)", description: "Length of string excluding '\\0'", notes: "O(N) scan! Store it in a variable before looping" },
          { syntax: "strcmp(a, b) == 0", description: "True when strings a and b have identical content", notes: "Returns <0, 0, or >0" },
          { syntax: "tolower((unsigned char)c) / toupper(...)", description: "Convert character case", notes: "From <ctype.h>" },
          { syntax: "c - 'a'", description: "0-based alphabet index (0..25) for lowercase char", notes: "Standard frequency array index" },
        ],
        codeSnippet: `#include <ctype.h>
#include <stdio.h>
#include <string.h>

int main(void) {
    char s[] = "Exeku";
    int n = (int)strlen(s);
    for (int i = 0; i < n / 2; i++) {
        char tmp = s[i];
        s[i] = s[n - 1 - i];
        s[n - 1 - i] = tmp;
    }
    printf("Reversed in place: %s\\n", s);
    return 0;
}`,
        pitfalls: [
          "Writing for (int i = 0; i < strlen(s); i++) recomputes strlen(s) on every iteration, turning an O(N) loop into O(N^2) TLE! Compute int n = strlen(s); once before the loop.",
        ],
      },
    },
  },
  {
    id: "sorting-searching",
    order: "06",
    title: "Sorting, Searching & Built-in Algorithms",
    shortTitle: "Sorting & Searching",
    category: "Algorithms",
    tags: ["sorting", "sort", "binary-search", "min", "max", "algorithms"],
    relatedChapterId: "loops",
    summary: "Sorting arrays and custom intervals in O(N log N), binary search, and min/max aggregation.",
    byLanguage: {
      python: {
        title: "Python Timsort (sort / sorted) & bisect",
        overview:
          "Python's built-in Timsort runs in O(N log N) and accepts a key= lambda for custom sorting (such as sorting intervals by start point or strings by length).",
        referenceTable: [
          { syntax: "arr.sort()  /  sorted(arr)", description: "Sort list in place / return new sorted list", notes: "O(N log N), stable sort" },
          { syntax: "arr.sort(reverse=True)", description: "Sort in descending order", notes: "Largest to smallest" },
          { syntax: "intervals.sort(key=lambda x: (x[0], x[1]))", description: "Sort pairs/intervals by start, then end", notes: "Tuple key comparison" },
          { syntax: "min(arr), max(arr), sum(arr)", description: "Smallest, largest, and total sum of iterable", notes: "O(N)" },
          { syntax: "bisect.bisect_left(arr, target)", description: "Binary search insertion index in sorted list", notes: "O(log N) from import bisect" },
        ],
        codeSnippet: `nums = [42, 7, 19, 3, 25]
nums.sort()
print("Ascending:", *nums)
print("Min / Max / Sum:", min(nums), max(nums), sum(nums))

intervals = [[5, 10], [1, 3], [2, 6]]
intervals.sort(key=lambda iv: iv[0])
print("Sorted intervals:", intervals)`,
        pitfalls: [
          "arr.sort() modifies the list in place and returns None — do not write arr = arr.sort().",
        ],
      },
      java: {
        title: "Java Arrays.sort & Collections.sort",
        overview:
          "Use Arrays.sort(arr) for primitive arrays and custom Comparator lambdas (a, b) -> Integer.compare(a[0], b[0]) for 2D interval arrays.",
        referenceTable: [
          { syntax: "Arrays.sort(arr);", description: "Sort primitive array in ascending order", notes: "O(N log N)" },
          { syntax: "Arrays.sort(intervals, (a, b) -> Integer.compare(a[0], b[0]));", description: "Sort 2D interval rows by start time", notes: "Avoids a[0] - b[0] overflow" },
          { syntax: "Collections.sort(list);", description: "Sort an ArrayList in ascending order", notes: "list.sort(Comparator.reverseOrder()) for desc" },
          { syntax: "Arrays.binarySearch(arr, target)", description: "Binary search a sorted array in O(log N)", notes: "Returns index or -(insertionPoint) - 1" },
          { syntax: "Math.min(a, b) / Math.max(a, b) / Math.abs(x)", description: "Pairwise min, max, and absolute value", notes: "Works for int, long, double" },
        ],
        codeSnippet: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        int[] nums = {42, 7, 19, 3, 25};
        Arrays.sort(nums);
        System.out.println("Sorted: " + Arrays.toString(nums));

        int[][] intervals = {{5, 10}, {1, 3}, {2, 6}};
        Arrays.sort(intervals, (a, b) -> Integer.compare(a[0], b[0]));
        System.out.println("First interval: " + intervals[0][0] + " " + intervals[0][1]);
    }
}`,
        pitfalls: [
          "In Java comparators, never write (a, b) -> a[0] - b[0] when values can be negative (like -10^9), because subtraction can overflow 32-bit int! Always use Integer.compare(a[0], b[0]).",
        ],
      },
      cpp: {
        title: "C++ <algorithm> (std::sort, lower_bound, min/max)",
        overview:
          "C++'s <algorithm> header provides std::sort (O(N log N)), std::lower_bound (binary search), std::min, std::max, and std::max_element.",
        referenceTable: [
          { syntax: "std::sort(v.begin(), v.end());", description: "Sort vector or string in ascending order", notes: "Pairs sort by .first then .second automatically" },
          { syntax: "std::sort(v.begin(), v.end(), std::greater<int>());", description: "Sort in descending order", notes: "Requires <functional>" },
          { syntax: "std::lower_bound(v.begin(), v.end(), x)", description: "Iterator to first element >= x in sorted vector", notes: "O(log N)" },
          { syntax: "std::min(a, b) / std::max(a, b)", description: "Minimum or maximum of two values", notes: "Both arguments must have the same type" },
        ],
        codeSnippet: `#include <algorithm>
#include <iostream>
#include <utility>
#include <vector>

int main() {
    std::vector<std::pair<int, int>> intervals = {{5, 10}, {1, 3}, {2, 6}};
    std::sort(intervals.begin(), intervals.end());

    for (const auto &iv : intervals) {
        std::cout << iv.first << ' ' << iv.second << '\\n';
    }
    return 0;
}`,
        pitfalls: [
          "std::max(a, b) fails to compile if a is int and b is long long — cast both to the same type: std::max<long long>(a, b).",
        ],
      },
      c: {
        title: "C qsort() from <stdlib.h>",
        overview:
          "C's standard library provides qsort(base, count, sizeof_element, comparator) in <stdlib.h> to sort any array in O(N log N).",
        referenceTable: [
          { syntax: "qsort(arr, n, sizeof(int), cmpInt);", description: "Sort an array of n ints using comparator cmpInt", notes: "From <stdlib.h>" },
          { syntax: "(x > y) - (x < y)", description: "Overflow-safe comparator return expression", notes: "Returns -1, 0, or 1" },
          { syntax: "bsearch(&key, arr, n, sizeof(int), cmpInt)", description: "Binary search sorted array", notes: "Returns pointer to match or NULL" },
        ],
        codeSnippet: `#include <stdio.h>
#include <stdlib.h>

int cmpInt(const void *a, const void *b) {
    int x = *(const int *)a;
    int y = *(const int *)b;
    return (x > y) - (x < y);
}

int main(void) {
    int nums[] = {42, 7, 19, 3, 25};
    int n = 5;
    qsort(nums, (size_t)n, sizeof(int), cmpInt);
    for (int i = 0; i < n; i++) {
        printf("%d%c", nums[i], i + 1 < n ? ' ' : '\\n');
    }
    return 0;
}`,
        pitfalls: [
          "In a C qsort comparator, avoid return x - y; because subtracting a negative integer from a positive one can overflow INT_MAX. Use return (x > y) - (x < y);.",
        ],
      },
    },
  },
  {
    id: "maps-sets",
    order: "07",
    title: "Hash Maps, Sets & Frequency Counting",
    shortTitle: "Hash Maps & Sets",
    category: "Data Structures",
    tags: ["hash-table", "hashmap", "dict", "set", "frequency"],
    relatedChapterId: "conditionals",
    summary: "O(1) key-value lookup, duplicate detection, and character/number frequency tables.",
    byLanguage: {
      python: {
        title: "Python dict, set & collections.Counter",
        overview:
          "Python's dict and set are hash tables with O(1) average lookup, insertion, and deletion — ideal for Two Sum, anagram checks, and sliding windows.",
        referenceTable: [
          { syntax: "seen = {}  or  seen = dict()", description: "Create an empty hash map (dictionary)", notes: "seen[key] = val" },
          { syntax: "key in seen", description: "Check if key exists in dict or set in O(1)", notes: "seen.get(key, 0) returns default 0" },
          { syntax: "uniq = set()", description: "Hash set of unique elements", notes: "uniq.add(x), uniq.discard(x)" },
          { syntax: "from collections import Counter", description: "Count frequencies of elements in an iterable", notes: "Counter('listen') == Counter('silent')" },
        ],
        codeSnippet: `# Two-Sum O(N) lookup pattern with a Python dict
nums = [2, 7, 11, 15]
target = 9
index_of = {}

for i, x in enumerate(nums):
    need = target - x
    if need in index_of:
        print(index_of[need], i)
        break
    index_of[x] = i`,
        pitfalls: [
          "Checking x in my_list is O(N) linear scan, whereas x in my_set or x in my_dict is O(1) hash lookup.",
        ],
      },
      java: {
        title: "Java HashMap<K, V> & HashSet<T>",
        overview:
          "Java's HashMap and HashSet from java.util provide O(1) average key lookup. Use wrapper types like Integer, Long, Character, or String as generic type parameters.",
        referenceTable: [
          { syntax: "Map<Integer, Integer> map = new HashMap<>();", description: "Hash map from int key to int value", notes: "O(1) average put/get" },
          { syntax: "map.put(k, v) / map.get(k)", description: "Insert key-value pair / retrieve value (or null)", notes: "map.containsKey(k)" },
          { syntax: "map.getOrDefault(k, 0)", description: "Return value for key k, or 0 if absent", notes: "Great for frequency counting" },
          { syntax: "Set<Integer> set = new HashSet<>();", description: "Hash set of unique values", notes: "set.add(x), set.contains(x), set.remove(x)" },
        ],
        codeSnippet: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        int[] nums = {2, 7, 11, 15};
        int target = 9;
        Map<Integer, Integer> seen = new HashMap<>();

        for (int i = 0; i < nums.length; i++) {
            int need = target - nums[i];
            if (seen.containsKey(need)) {
                System.out.println(seen.get(need) + " " + i);
                break;
            }
            seen.put(nums[i], i);
        }
    }
}`,
        pitfalls: [
          "Comparing two Integer objects retrieved from a map with == only works for -128..127 due to boxing cache — use .equals() or unbox to int.",
        ],
      },
      cpp: {
        title: "C++ std::unordered_map & std::unordered_set",
        overview:
          "C++ provides O(1) hash tables (<unordered_map>, <unordered_set>) and O(log N) ordered red-black trees (<map>, <set>).",
        referenceTable: [
          { syntax: "std::unordered_map<long long, int> mp;", description: "Hash map with O(1) average lookup", notes: "From <unordered_map>" },
          { syntax: "mp.find(k) != mp.end()  or  mp.count(k)", description: "Check if key k exists without inserting it", notes: "Reading mp[k] inserts 0 if absent!" },
          { syntax: "std::unordered_set<int> st;", description: "Hash set of unique elements", notes: "st.insert(x), st.erase(x), st.count(x)" },
        ],
        codeSnippet: `#include <iostream>
#include <unordered_map>
#include <vector>

int main() {
    std::vector<int> nums = {2, 7, 11, 15};
    int target = 9;
    std::unordered_map<int, int> seen;

    for (int i = 0; i < (int)nums.size(); i++) {
        int need = target - nums[i];
        if (seen.count(need)) {
            std::cout << seen[need] << ' ' << i << '\\n';
            break;
        }
        seen[nums[i]] = i;
    }
    return 0;
}`,
        pitfalls: [
          "Evaluating mp[key] in C++ automatically inserts key with a default value of 0 if it wasn't present! Use mp.count(key) or mp.find(key) != mp.end() to test existence.",
        ],
      },
      c: {
        title: "C Frequency Arrays & Sorting + Binary Search",
        overview:
          "Because the C standard library does not ship a generic hash map, C solutions use direct ASCII/value frequency arrays (int freq[256] = {0}) or sort (value, index) structs with qsort.",
        referenceTable: [
          { syntax: "int freq[26] = {0}; freq[s[i] - 'a']++;", description: "O(1) frequency table for lowercase letters", notes: "Use int freq[256] = {0}; for all ASCII chars" },
          { syntax: "typedef struct { long long val; int idx; } Entry;", description: "Pair value with original 0-based index", notes: "Sort with qsort for O(N log N) Two-Sum" },
        ],
        codeSnippet: `#include <stdio.h>
#include <string.h>

int main(void) {
    const char *a = "listen";
    const char *b = "silent";
    int freq[26] = {0};

    for (int i = 0; a[i]; i++) freq[a[i] - 'a']++;
    for (int i = 0; b[i]; i++) freq[b[i] - 'a']--;

    int ok = 1;
    for (int c = 0; c < 26; c++) {
        if (freq[c] != 0) ok = 0;
    }
    printf("%s\\n", ok ? "YES" : "NO");
    return 0;
}`,
        pitfalls: [
          "Always cast characters to (unsigned char) when indexing a 256-slot ASCII table so signed negative char values don't index before array[0].",
        ],
      },
    },
  },
  {
    id: "functions-recursion",
    order: "08",
    title: "Functions, Recursion & Contest Checklist",
    shortTitle: "Functions & Tips",
    category: "Core Language",
    tags: ["functions", "recursion", "complexity", "tips", "debugging"],
    relatedChapterId: "functions",
    summary: "Defining helper functions, passing arrays efficiently, recursion limits, and pre-submit checklist.",
    byLanguage: {
      python: {
        title: "Python Functions & Pre-Submit Checklist",
        overview:
          "Define reusable helpers with def. Python passes lists and dicts by object reference, and sys.setrecursionlimit(200000) raises the default 1000-frame recursion cap when needed.",
        referenceTable: [
          { syntax: "def solve(nums: list[int]) -> int:", description: "Define function with optional type hints", notes: "Lists are passed by reference" },
          { syntax: "return a, b", description: "Return multiple values as a tuple", notes: "x, y = my_func()" },
          { syntax: "sys.setrecursionlimit(200000)", description: "Increase max recursion depth beyond 1000", notes: "From import sys" },
        ],
        codeSnippet: `def max_subarray_sum(nums):
    current = best = nums[0]
    for x in nums[1:]:
        current = max(x, current + x)
        best = max(best, current)
    return best

print(max_subarray_sum([-2, 1, -3, 4, -1, 2, 1, -5, 4]))`,
        pitfalls: [
          "Never use a mutable default argument like def add_item(x, items=[]): because the default list is shared across every call!",
        ],
      },
      java: {
        title: "Java Static Methods & Pre-Submit Checklist",
        overview:
          "Declare helper methods inside class Main as static so main() can call them directly without instantiating Main.",
        referenceTable: [
          { syntax: "static long solve(int[] nums)", description: "Static helper taking an array reference", notes: "Arrays are passed by reference" },
          { syntax: "return result;", description: "Return value matching method return type", notes: "Use void if nothing is returned" },
        ],
        codeSnippet: `public class Main {
    static long maxSubarraySum(int[] nums) {
        long current = nums[0];
        long best = nums[0];
        for (int i = 1; i < nums.length; i++) {
            current = Math.max(nums[i], current + nums[i]);
            best = Math.max(best, current);
        }
        return best;
    }

    public static void main(String[] args) {
        int[] sample = {-2, 1, -3, 4, -1, 2, 1, -5, 4};
        System.out.println(maxSubarraySum(sample));
    }
}`,
        pitfalls: [
          "Check whether the answer can exceed 2^31 - 1 (2.14e9) even when individual array elements fit in int — if so, make your method return long.",
        ],
      },
      cpp: {
        title: "C++ Pass-by-Reference & Pre-Submit Checklist",
        overview:
          "Always pass large std::vector or std::string arguments by const reference (const std::vector<int>& v) so C++ does not copy the entire container on every call.",
        referenceTable: [
          { syntax: "long long solve(const std::vector<int>& v)", description: "Read-only pass by reference (O(1), zero copy)", notes: "Without &, the whole vector is copied!" },
          { syntax: "void modify(std::vector<int>& v)", description: "Mutable pass by reference", notes: "Changes affect caller's vector" },
        ],
        codeSnippet: `#include <algorithm>
#include <iostream>
#include <vector>

long long maxSubarraySum(const std::vector<int>& nums) {
    long long current = nums[0];
    long long best = nums[0];
    for (std::size_t i = 1; i < nums.size(); i++) {
        current = std::max<long long>(nums[i], current + nums[i]);
        best = std::max(best, current);
    }
    return best;
}

int main() {
    std::cout << maxSubarraySum({-2, 1, -3, 4, -1, 2, 1, -5, 4}) << '\\n';
    return 0;
}`,
        pitfalls: [
          "Passing std::vector<int> v by value inside a recursive function copies the vector at every recursion step, turning O(N) into O(N^2) Memory/Time Limit Exceeded.",
        ],
      },
      c: {
        title: "C Functions, Pointers & Pre-Submit Checklist",
        overview:
          "In C, arrays decay to pointers when passed to functions. Always pass the element countint n alongside the array pointer (const int arr[], int n).",
        referenceTable: [
          { syntax: "long long solve(const int arr[], int n)", description: "Pass read-only array pointer and its length n", notes: "O(1) pointer pass" },
          { syntax: "void swap(int *a, int *b)", description: "Pass variables by pointer to modify caller values", notes: "Call as swap(&x, &y);" },
        ],
        codeSnippet: `#include <stdio.h>

long long maxSubarraySum(const int nums[], int n) {
    long long current = nums[0];
    long long best = nums[0];
    for (int i = 1; i < n; i++) {
        long long extended = current + nums[i];
        current = nums[i] > extended ? nums[i] : extended;
        if (current > best) best = current;
    }
    return best;
}

int main(void) {
    int sample[] = {-2, 1, -3, 4, -1, 2, 1, -5, 4};
    printf("%lld\\n", maxSubarraySum(sample, 9));
    return 0;
}`,
        pitfalls: [
          "Never use sizeof(arr) / sizeof(arr[0]) inside a function parameter because arr has decayed to a pointer (sizeof(int*) is 8 bytes, not the array size).",
        ],
      },
    },
  },
];

export function getLanguageDocTopic(id?: string | null): LanguageDocTopic {
  if (!id) return LANGUAGE_DOC_TOPICS[0];
  return LANGUAGE_DOC_TOPICS.find((t) => t.id === id) ?? LANGUAGE_DOC_TOPICS[0];
}
