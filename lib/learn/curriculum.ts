import type { PreferredLanguage } from "@/types/profile";

export type LearnChapterId =
  | "syntax-output"
  | "variables-types"
  | "printing-arrays"
  | "loops"
  | "conditionals"
  | "user-input"
  | "strings"
  | "functions";

export interface LearnExercise {
  prompt: string;
  codeTemplate: string;
  answer: string;
  acceptedAnswers?: string[];
  hint: string;
}

export interface LanguageLesson {
  headline: string;
  intro: string;
  keyRules: string[];
  syntaxSnippet: string;
  exampleTitle: string;
  exampleCode: string;
  exampleStdin?: string;
  expectedOutput: string;
  exercise: LearnExercise;
}

export interface LearnChapter {
  id: LearnChapterId;
  number: string;
  title: string;
  shortTitle: string;
  summary: string;
  tags: string[];
  lessons: Record<PreferredLanguage, LanguageLesson>;
}

export const LEARN_CHAPTERS: LearnChapter[] = [
  {
    id: "syntax-output",
    number: "01",
    title: "Syntax & Printing Output",
    shortTitle: "Syntax & Output",
    summary: "Learn how a program starts, how statements are written, and how to print output to the console.",
    tags: ["syntax", "output", "print", "basics"],
    lessons: {
      python: {
        headline: "Python Syntax & print()",
        intro:
          "Python executes code line by line from top to bottom. It uses indentation (4 spaces) instead of curly braces to group blocks of code, and the built-in print() function outputs text or numbers followed by a newline.",
        keyRules: [
          "No semicolons are needed at the end of a line.",
          "Comments start with # and are ignored when running.",
          "print(a, b) separates multiple values with a space automatically.",
        ],
        syntaxSnippet: `# Comment line\nprint("Hello, World!")\nprint(100, 200)`,
        exampleTitle: "Example: Printing lines and values in Python",
        exampleCode: `# Python Syntax & Output\nprint("Welcome to Exeku Learn!")\nprint("Result:", 20 + 22)\n`,
        expectedOutput: `Welcome to Exeku Learn!\nResult: 42\n`,
        exercise: {
          prompt: "Fill in the function name used to display text on the screen in Python:",
          codeTemplate: `___("Hello, Python!")`,
          answer: "print",
          hint: "Python uses the 5-letter built-in function print(...).",
        },
      },
      java: {
        headline: "Java Syntax & System.out.println()",
        intro:
          "Every Java program runs inside a class. On Exeku, the entry class is always public class Main with a public static void main(String[] args) method. Statements end with a semicolon (;).",
        keyRules: [
          "The entry point is always public static void main(String[] args) inside class Main.",
          "System.out.println(...) prints a line with a newline; System.out.print(...) stays on the same line.",
          "Every statement must end with a semicolon ;.",
        ],
        syntaxSnippet: `public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello!");\n    }\n}`,
        exampleTitle: "Example: Main class and console output in Java",
        exampleCode: `public class Main {\n    public static void main(String[] args) {\n        System.out.println("Welcome to Exeku Learn!");\n        System.out.println("Result: " + (20 + 22));\n    }\n}\n`,
        expectedOutput: `Welcome to Exeku Learn!\nResult: 42\n`,
        exercise: {
          prompt: "Complete the Java method call to print a full line of text:",
          codeTemplate: `System.out.___("Hello, Java!");`,
          answer: "println",
          acceptedAnswers: ["println", "print"],
          hint: "Use println to print text followed by a new line.",
        },
      },
      cpp: {
        headline: "C++ Syntax & std::cout",
        intro:
          "C++ programs include <iostream> for input and output and start execution inside int main(). Use std::cout with the insertion operator (<<) to send text and numbers to standard output.",
        keyRules: [
          "#include <iostream> unlocks std::cout and std::cin.",
          "Chain values with << and end a line with '\\n' or std::endl.",
          "Return 0 from main() to signal that the program finished cleanly.",
        ],
        syntaxSnippet: `#include <iostream>\n\nint main() {\n    std::cout << "Hello!" << '\\n';\n    return 0;\n}`,
        exampleTitle: "Example: Printing with std::cout in C++",
        exampleCode: `#include <iostream>\n\nint main() {\n    std::cout << "Welcome to Exeku Learn!" << '\\n';\n    std::cout << "Result: " << (20 + 22) << '\\n';\n    return 0;\n}\n`,
        expectedOutput: `Welcome to Exeku Learn!\nResult: 42\n`,
        exercise: {
          prompt: "Fill in the standard output stream object in C++:",
          codeTemplate: `std::___ << "Hello, C++!" << '\\n';`,
          answer: "cout",
          hint: "Character output in C++ is named cout.",
        },
      },
      c: {
        headline: "C Syntax & printf()",
        intro:
          "C programs include <stdio.h> and start inside int main(void). The printf() function prints formatted strings using format specifiers like %d for integers and \\n for a newline.",
        keyRules: [
          "Include <stdio.h> at the top of your file to use printf and scanf.",
          "printf does not add a newline automatically — include \\n at the end of the format string.",
          "Use %d for int, %lld for long long, %f for double, and %s for strings.",
        ],
        syntaxSnippet: `#include <stdio.h>\n\nint main(void) {\n    printf("Score: %d\\n", 100);\n    return 0;\n}`,
        exampleTitle: "Example: Formatted output with printf() in C",
        exampleCode: `#include <stdio.h>\n\nint main(void) {\n    printf("Welcome to Exeku Learn!\\n");\n    printf("Result: %d\\n", 20 + 22);\n    return 0;\n}\n`,
        expectedOutput: `Welcome to Exeku Learn!\nResult: 42\n`,
        exercise: {
          prompt: "Fill in the C function used for formatted console output:",
          codeTemplate: `___("Hello, C!\\n");`,
          answer: "printf",
          hint: "C uses printf (print formatted) from <stdio.h>.",
        },
      },
    },
  },
  {
    id: "variables-types",
    number: "02",
    title: "Variables & Data Types",
    shortTitle: "Variables & Types",
    summary: "Store integers, decimals, strings, and booleans in variables and format them cleanly.",
    tags: ["variables", "types", "strings", "numbers"],
    lessons: {
      python: {
        headline: "Python Variables & f-Strings",
        intro:
          "In Python, you create a variable the moment you assign a value with =. Python infers the type automatically (int, float, str, bool), and f-strings (f\"...\") let you embed variables directly inside curly braces.",
        keyRules: [
          "Variable names use snake_case by convention (e.g., student_count = 25).",
          "Use f\"{name} scored {points}\" to format variables inside strings cleanly.",
          "Convert strings to integers with int(\"42\") and numbers to strings with str(42).",
        ],
        syntaxSnippet: `name = "Ada"\npoints = 120\nprint(f"{name} has {points} points")`,
        exampleTitle: "Example: Variables and f-string formatting in Python",
        exampleCode: `language = "Python"\nyear = 2026\npi = 3.14159\n\nprint(f"Learning {language} in {year}")\nprint(f"Rounded pi: {pi:.2f}")\n`,
        expectedOutput: `Learning Python in 2026\nRounded pi: 3.14\n`,
        exercise: {
          prompt: "Add the single-letter prefix before the quote to make this an interpolated f-string:",
          codeTemplate: `name = "Exeku"\nprint(___"Hello {name}")`,
          answer: "f",
          acceptedAnswers: ["f", "F"],
          hint: "Formatted string literals in Python start with the letter f.",
        },
      },
      java: {
        headline: "Java Variables & Primitive Types",
        intro:
          "Java is statically typed: every variable must declare its type before its name, such as int for whole numbers, long for large 64-bit integers, double for decimals, boolean for true/false, and String for text.",
        keyRules: [
          "int holds up to ~2 billion; use long (with an L suffix) for larger counts.",
          "String is capitalized because it is an object type, not a primitive.",
          "Use + to concatenate strings and numbers when printing.",
        ],
        syntaxSnippet: `int score = 120;\ndouble ratio = 0.95;\nString name = "Ada";`,
        exampleTitle: "Example: Declaring and printing typed variables in Java",
        exampleCode: `public class Main {\n    public static void main(String[] args) {\n        String language = "Java";\n        int version = 17;\n        boolean ready = true;\n\n        System.out.println("Language: " + language + " " + version);\n        System.out.println("Sandbox ready: " + ready);\n    }\n}\n`,
        expectedOutput: `Language: Java 17\nSandbox ready: true\n`,
        exercise: {
          prompt: "Fill in the Java type used to store text like \"Exeku\":",
          codeTemplate: `___ campus = "Santa Cruz";`,
          answer: "String",
          hint: "Java's text type starts with a capital S: String.",
        },
      },
      cpp: {
        headline: "C++ Variables & Fundamental Types",
        intro:
          "C++ requires a type when declaring variables: int, long long (for 64-bit integers), double, char, bool, and std::string (from <string>). You can also use auto when initializing directly.",
        keyRules: [
          "Include <string> whenever you work with std::string.",
          "Use long long when sums or products can exceed 2,147,483,647.",
          "Always initialize local variables before reading them.",
        ],
        syntaxSnippet: `#include <string>\nint count = 10;\nlong long big = 10000000000LL;\nstd::string name = "Ada";`,
        exampleTitle: "Example: Numbers, booleans, and std::string in C++",
        exampleCode: `#include <iostream>\n#include <string>\n\nint main() {\n    std::string language = "C++";\n    int standard = 20;\n    double speed = 1.5;\n\n    std::cout << "Language: " << language << standard << '\\n';\n    std::cout << "Multiplier: " << speed << '\\n';\n    return 0;\n}\n`,
        expectedOutput: `Language: C++20\nMultiplier: 1.5\n`,
        exercise: {
          prompt: "Fill in the C++ type used for whole numbers:",
          codeTemplate: `___ points = 250;`,
          answer: "int",
          acceptedAnswers: ["int", "long", "auto"],
          hint: "Standard 32-bit integers use the keyword int.",
        },
      },
      c: {
        headline: "C Variables & Format Specifiers",
        intro:
          "In C, variables have fixed types: int, long long, double, char, and character arrays (char[] or const char*) for strings. Each type has a matching printf format specifier.",
        keyRules: [
          "%d prints an int; %lld prints a long long.",
          "%.2f prints a double or float rounded to 2 decimal places.",
          "%s prints a null-terminated character string (const char* or char[]).",
        ],
        syntaxSnippet: `int age = 20;\ndouble gpa = 1.25;\nconst char *name = "Ada";\nprintf("%s (%d): %.2f\\n", name, age, gpa);`,
        exampleTitle: "Example: Variables and format specifiers in C",
        exampleCode: `#include <stdio.h>\n\nint main(void) {\n    const char *track = "Algorithms";\n    int problems = 12;\n    double accuracy = 94.5;\n\n    printf("Track: %s\\n", track);\n    printf("Solved: %d (%.1f%%)\\n", problems, accuracy);\n    return 0;\n}\n`,
        expectedOutput: `Track: Algorithms\nSolved: 12 (94.5%)\n`,
        exercise: {
          prompt: "Fill in the printf format specifier used to print an int:",
          codeTemplate: `int count = 7;\nprintf("Count: ___\\n", count);`,
          answer: "%d",
          acceptedAnswers: ["%d", "%i"],
          hint: "Decimal integers use %d in printf.",
        },
      },
    },
  },
  {
    id: "printing-arrays",
    number: "03",
    title: "Arrays & Lists (Printing an Array)",
    shortTitle: "Arrays & Lists",
    summary: "Create arrays or lists, access elements by 0-based index, and print an array cleanly in any format.",
    tags: ["array", "arrays", "list", "printing", "index"],
    lessons: {
      python: {
        headline: "Python Lists & Printing an Array",
        intro:
          "In Python, lists (like numbers = [10, 20, 30, 40]) work as dynamic arrays. You can print the whole list with print(numbers), unpack it space-separated with print(*numbers), or loop through each item with for x in numbers:.",
        keyRules: [
          "Array indices start at 0: numbers[0] is the first item, numbers[-1] is the last.",
          "len(numbers) returns how many elements are in the list.",
          "print(*numbers) prints all elements on one line separated by spaces — essential for coding contests!",
        ],
        syntaxSnippet: `nums = [10, 20, 30, 40]\nprint(nums)       # [10, 20, 30, 40]\nprint(*nums)      # 10 20 30 40\nfor x in nums:\n    print(x)`,
        exampleTitle: "Example: 3 ways to print an array in Python",
        exampleCode: `# Creating and printing an array (list) in Python\nscores = [10, 20, 30, 40, 50]\n\n# 1. Print the raw list representation\nprint("Raw list:", scores)\n\n# 2. Print elements space-separated on one line\nprint("Unpacked:", *scores)\n\n# 3. Print each index and value with a loop\nfor i in range(len(scores)):\n    print(f"Index {i} -> {scores[i]}")\n`,
        expectedOutput: `Raw list: [10, 20, 30, 40, 50]\nUnpacked: 10 20 30 40 50\nIndex 0 -> 10\nIndex 1 -> 20\nIndex 2 -> 30\nIndex 3 -> 40\nIndex 4 -> 50\n`,
        exercise: {
          prompt: "Fill in the built-in function that returns the number of elements in a Python list:",
          codeTemplate: `nums = [10, 20, 30, 40]\nprint(___(nums))`,
          answer: "len",
          hint: "Short for length: len(nums).",
        },
      },
      java: {
        headline: "Java Arrays & Printing an Array",
        intro:
          "In Java, a fixed-size array is declared with int[] scores = {10, 20, 30, 40};. Calling System.out.println(scores) directly prints a memory hash, so use Arrays.toString(scores) or a for loop to print its elements!",
        keyRules: [
          "scores.length gives the number of elements (no parentheses on arrays).",
          "Arrays.toString(scores) from java.util.Arrays formats the array as [10, 20, 30, 40].",
          "Use an enhanced for-each loop: for (int x : scores) to visit every item.",
        ],
        syntaxSnippet: `import java.util.Arrays;\nint[] nums = {10, 20, 30};\nSystem.out.println(Arrays.toString(nums));\nfor (int x : nums) {\n    System.out.print(x + " ");\n}`,
        exampleTitle: "Example: Printing an array in Java with Arrays.toString and loops",
        exampleCode: `import java.util.Arrays;\n\npublic class Main {\n    public static void main(String[] args) {\n        int[] scores = {10, 20, 30, 40, 50};\n\n        // 1. Print formatted bracketed array\n        System.out.println("Bracketed: " + Arrays.toString(scores));\n\n        // 2. Print space-separated on one line\n        System.out.print("Elements: ");\n        for (int i = 0; i < scores.length; i++) {\n            System.out.print(scores[i] + (i + 1 < scores.length ? " " : "\\n"));\n        }\n    }\n}\n`,
        expectedOutput: `Bracketed: [10, 20, 30, 40, 50]\nElements: 10 20 30 40 50\n`,
        exercise: {
          prompt: "Fill in the property that returns the number of elements in a Java array:",
          codeTemplate: `int[] nums = {10, 20, 30};\nSystem.out.println(nums.___);`,
          answer: "length",
          hint: "Java arrays have a .length field (without parentheses).",
        },
      },
      cpp: {
        headline: "C++ Vectors/Arrays & Printing an Array",
        intro:
          "In modern C++, std::vector<int> from <vector> is the go-to dynamic array. You can initialize it with {10, 20, 30, 40}, check its length with .size(), and print every element using a range-based for loop.",
        keyRules: [
          "#include <vector> provides std::vector<T>.",
          "for (int x : scores) iterates through every element cleanly.",
          "scores[0] accesses the first element and scores.size() returns the element count.",
        ],
        syntaxSnippet: `#include <vector>\nstd::vector<int> nums = {10, 20, 30};\nfor (int x : nums) {\n    std::cout << x << ' ';\n}`,
        exampleTitle: "Example: Printing a vector/array in C++",
        exampleCode: `#include <iostream>\n#include <vector>\n\nint main() {\n    std::vector<int> scores = {10, 20, 30, 40, 50};\n\n    std::cout << "Array size: " << scores.size() << '\\n';\n    std::cout << "Elements: ";\n    for (std::size_t i = 0; i < scores.size(); i++) {\n        std::cout << scores[i] << (i + 1 < scores.size() ? ' ' : '\\n');\n    }\n    return 0;\n}\n`,
        expectedOutput: `Array size: 5\nElements: 10 20 30 40 50\n`,
        exercise: {
          prompt: "Fill in the method that returns the number of elements in a C++ std::vector:",
          codeTemplate: `std::vector<int> nums = {10, 20, 30};\nstd::cout << nums.___();`,
          answer: "size",
          hint: "C++ containers use .size() to report their length.",
        },
      },
      c: {
        headline: "C Arrays & Printing an Array",
        intro:
          "In C, an array is declared as int scores[] = {10, 20, 30, 40, 50};. Because C arrays do not store a .length field, you compute the length with sizeof(scores) / sizeof(scores[0]) and loop from 0 to n - 1.",
        keyRules: [
          "Indices run from 0 up to n - 1.",
          "int n = sizeof(arr) / sizeof(arr[0]); calculates the element count of a local array.",
          "Use a for loop with printf(\"%d \", arr[i]) to print elements.",
        ],
        syntaxSnippet: `int nums[] = {10, 20, 30};\nint n = sizeof(nums) / sizeof(nums[0]);\nfor (int i = 0; i < n; i++) {\n    printf("%d ", nums[i]);\n}`,
        exampleTitle: "Example: Looping and printing an integer array in C",
        exampleCode: `#include <stdio.h>\n\nint main(void) {\n    int scores[] = {10, 20, 30, 40, 50};\n    int n = (int)(sizeof(scores) / sizeof(scores[0]));\n\n    printf("Array length: %d\\n", n);\n    printf("Elements: ");\n    for (int i = 0; i < n; i++) {\n        printf("%d%c", scores[i], i + 1 < n ? ' ' : '\\n');\n    }\n    return 0;\n}\n`,
        expectedOutput: `Array length: 5\nElements: 10 20 30 40 50\n`,
        exercise: {
          prompt: "What index accesses the very first element of an array in C?",
          codeTemplate: `int nums[] = {10, 20, 30};\nprintf("%d\\n", nums[___]);`,
          answer: "0",
          hint: "C arrays are 0-indexed, so the first element is at index 0.",
        },
      },
    },
  },
  {
    id: "loops",
    number: "04",
    title: "Loops (for & while)",
    shortTitle: "Loops (for / while)",
    summary: "Repeat instructions, iterate over ranges of numbers, and accumulate totals.",
    tags: ["loops", "for", "while", "iteration"],
    lessons: {
      python: {
        headline: "Python for & while Loops",
        intro:
          "Python's for loop pairs with range(start, stop, step) to count through numbers. Remember that range(1, 6) generates 1, 2, 3, 4, 5 (the stop value is excluded).",
        keyRules: [
          "range(n) produces 0, 1, ..., n - 1.",
          "range(a, b) produces a, a + 1, ..., b - 1.",
          "Use break to exit a loop early and continue to skip to the next iteration.",
        ],
        syntaxSnippet: `total = 0\nfor i in range(1, 6):\n    total += i\nprint(total)`,
        exampleTitle: "Example: Summing 1 to 5 and printing squares in Python",
        exampleCode: `total = 0\nfor i in range(1, 6):\n    total += i\n    print(f"i={i}, square={i * i}")\n\nprint("Sum 1..5 =", total)\n`,
        expectedOutput: `i=1, square=1\ni=2, square=4\ni=3, square=9\ni=4, square=16\ni=5, square=25\nSum 1..5 = 15\n`,
        exercise: {
          prompt: "Fill in the Python function used with for loops to iterate over a sequence of numbers:",
          codeTemplate: `for i in ___(5):\n    print(i)`,
          answer: "range",
          hint: "Use range(5) to loop from 0 to 4.",
        },
      },
      java: {
        headline: "Java for & while Loops",
        intro:
          "Java's classic for loop has three parts separated by semicolons: initialization (int i = 1), condition (i <= 5), and update (i++). As long as the condition is true, the loop body runs.",
        keyRules: [
          "for (int i = 0; i < n; i++) runs exactly n times.",
          "i++ increments i by 1; i += 2 steps by 2.",
          "while (condition) is great when you don't know the exact iteration count ahead of time.",
        ],
        syntaxSnippet: `int total = 0;\nfor (int i = 1; i <= 5; i++) {\n    total += i;\n}`,
        exampleTitle: "Example: Counting and summing with a for loop in Java",
        exampleCode: `public class Main {\n    public static void main(String[] args) {\n        int total = 0;\n        for (int i = 1; i <= 5; i++) {\n            total += i;\n            System.out.println("i=" + i + ", square=" + (i * i));\n        }\n        System.out.println("Sum 1..5 = " + total);\n    }\n}\n`,
        expectedOutput: `i=1, square=1\ni=2, square=4\ni=3, square=9\ni=4, square=16\ni=5, square=25\nSum 1..5 = 15\n`,
        exercise: {
          prompt: "Fill in the increment operator to add 1 to i after each loop step:",
          codeTemplate: `for (int i = 0; i < 5; ___) {\n    System.out.println(i);\n}`,
          answer: "i++",
          acceptedAnswers: ["i++", "++i", "i += 1", "i = i + 1"],
          hint: "Use i++ to increment i by 1.",
        },
      },
      cpp: {
        headline: "C++ for & while Loops",
        intro:
          "C++ supports both index-based loops (for (int i = 1; i <= 5; i++)) and range-based loops (for (int x : vec)). Use while (n > 0) for digit extraction or pointer stepping.",
        keyRules: [
          "for (int i = 0; i < n; i++) is the standard 0-indexed loop.",
          "Initialize accumulator variables (like int total = 0;) before the loop starts.",
          "Use break to stop the loop and continue to skip the rest of the current pass.",
        ],
        syntaxSnippet: `int total = 0;\nfor (int i = 1; i <= 5; i++) {\n    total += i;\n}`,
        exampleTitle: "Example: Summing 1 to 5 and printing squares in C++",
        exampleCode: `#include <iostream>\n\nint main() {\n    int total = 0;\n    for (int i = 1; i <= 5; i++) {\n        total += i;\n        std::cout << "i=" << i << ", square=" << (i * i) << '\\n';\n    }\n    std::cout << "Sum 1..5 = " << total << '\\n';\n    return 0;\n}\n`,
        expectedOutput: `i=1, square=1\ni=2, square=4\ni=3, square=9\ni=4, square=16\ni=5, square=25\nSum 1..5 = 15\n`,
        exercise: {
          prompt: "Fill in the keyword to start a counting loop in C++:",
          codeTemplate: `___ (int i = 1; i <= 5; i++) {\n    std::cout << i << '\\n';\n}`,
          answer: "for",
          hint: "Use the for keyword.",
        },
      },
      c: {
        headline: "C for & while Loops",
        intro:
          "C's for (int i = 1; i <= 5; i++) loop runs fast and predictably. Always initialize your sum or counter variable to 0 before adding to it inside a loop.",
        keyRules: [
          "Declare the loop counter right inside the header: for (int i = 0; i < n; i++).",
          "total += i is shorthand for total = total + i.",
          "Avoid infinite loops by making sure your loop condition eventually becomes false.",
        ],
        syntaxSnippet: `int total = 0;\nfor (int i = 1; i <= 5; i++) {\n    total += i;\n}`,
        exampleTitle: "Example: Summing 1 to 5 and printing squares in C",
        exampleCode: `#include <stdio.h>\n\nint main(void) {\n    int total = 0;\n    for (int i = 1; i <= 5; i++) {\n        total += i;\n        printf("i=%d, square=%d\\n", i, i * i);\n    }\n    printf("Sum 1..5 = %d\\n", total);\n    return 0;\n}\n`,
        expectedOutput: `i=1, square=1\ni=2, square=4\ni=3, square=9\ni=4, square=16\ni=5, square=25\nSum 1..5 = 15\n`,
        exercise: {
          prompt: "Fill in the compound assignment operator to add i into total:",
          codeTemplate: `int total = 0;\nfor (int i = 1; i <= 5; i++) {\n    total ___ i;\n}`,
          answer: "+=",
          hint: "Use += to add the right side to the variable on the left.",
        },
      },
    },
  },
  {
    id: "conditionals",
    number: "05",
    title: "Conditionals (if / else)",
    shortTitle: "Conditionals",
    summary: "Make decisions with comparison operators, modulo arithmetic, and if / else chains.",
    tags: ["conditionals", "if", "else", "logic", "modulo"],
    lessons: {
      python: {
        headline: "Python if, elif, and else",
        intro:
          "Python uses if, elif (else if), and else followed by a colon (:). Combine conditions using the words and, or, and not. The modulo operator (%) returns the remainder of division.",
        keyRules: [
          "Use == to test equality (single = is assignment).",
          "n % 2 == 0 is True when n is an even number.",
          "Python uses elif instead of else if.",
        ],
        syntaxSnippet: `if score >= 90:\n    print("A")\nelif score >= 80:\n    print("B")\nelse:\n    print("Keep practicing")`,
        exampleTitle: "Example: Grading and parity check in Python",
        exampleCode: `for n in [12, 7, 0]:\n    parity = "Even" if n % 2 == 0 else "Odd"\n    if n > 0:\n        sign = "positive"\n    elif n < 0:\n        sign = "negative"\n    else:\n        sign = "zero"\n    print(f"{n} is {parity} and {sign}")\n`,
        expectedOutput: `12 is Even and positive\n7 is Odd and positive\n0 is Even and zero\n`,
        exercise: {
          prompt: "Fill in Python's keyword for 'else if':",
          codeTemplate: `if x > 0:\n    print("Positive")\n___ x < 0:\n    print("Negative")`,
          answer: "elif",
          hint: "Python shortens 'else if' into the 4-letter keyword elif.",
        },
      },
      java: {
        headline: "Java if, else if, and else",
        intro:
          "In Java, conditions inside if (...) must be enclosed in parentheses and evaluate to a boolean. Combine checks with && (and), || (or), and ! (not).",
        keyRules: [
          "Use == for primitive numbers (int, char), and .equals() when comparing two Strings.",
          "n % 2 == 0 checks if n is divisible by 2.",
          "The ternary operator condition ? a : b is handy for short inline choices.",
        ],
        syntaxSnippet: `if (score >= 90) {\n    System.out.println("A");\n} else if (score >= 80) {\n    System.out.println("B");\n} else {\n    System.out.println("C");\n}`,
        exampleTitle: "Example: Checking even/odd and sign in Java",
        exampleCode: `public class Main {\n    public static void main(String[] args) {\n        int[] nums = {12, 7, 0};\n        for (int n : nums) {\n            String parity = (n % 2 == 0) ? "Even" : "Odd";\n            String sign = (n > 0) ? "positive" : (n < 0 ? "negative" : "zero");\n            System.out.println(n + " is " + parity + " and " + sign);\n        }\n    }\n}\n`,
        expectedOutput: `12 is Even and positive\n7 is Odd and positive\n0 is Even and zero\n`,
        exercise: {
          prompt: "Fill in the operator that returns the remainder of n divided by 2:",
          codeTemplate: `if (n ___ 2 == 0) {\n    System.out.println("Even");\n}`,
          answer: "%",
          hint: "The modulo (remainder) operator is the percent sign %.",
        },
      },
      cpp: {
        headline: "C++ if, else if, and else",
        intro:
          "C++ wraps conditions in parentheses: if (condition) { ... } else if (other) { ... } else { ... }. Logical operators are && (AND), || (OR), and ! (NOT).",
        keyRules: [
          "Never confuse = (assignment) with == (equality check) inside an if condition.",
          "In C++, any non-zero number is truthy and 0 is falsy, but explicit comparisons (n != 0) are clearer.",
          "n % 2 == 0 tests if n is even.",
        ],
        syntaxSnippet: `if (n > 0) {\n    std::cout << "Positive\\n";\n} else if (n < 0) {\n    std::cout << "Negative\\n";\n} else {\n    std::cout << "Zero\\n";\n}`,
        exampleTitle: "Example: Even/odd and sign classification in C++",
        exampleCode: `#include <iostream>\n#include <vector>\n\nint main() {\n    for (int n : std::vector<int>{12, 7, 0}) {\n        const char* parity = (n % 2 == 0) ? "Even" : "Odd";\n        const char* sign = (n > 0) ? "positive" : (n < 0 ? "negative" : "zero");\n        std::cout << n << " is " << parity << " and " << sign << '\\n';\n    }\n    return 0;\n}\n`,
        expectedOutput: `12 is Even and positive\n7 is Odd and positive\n0 is Even and zero\n`,
        exercise: {
          prompt: "Fill in the C++ equality comparison operator:",
          codeTemplate: `if (n % 2 ___ 0) {\n    std::cout << "Even\\n";\n}`,
          answer: "==",
          hint: "Two equals signs (==) compare two values for equality.",
        },
      },
      c: {
        headline: "C if, else if, and else",
        intro:
          "C evaluates conditions inside if (...), treating 0 as false and any non-zero value as true. Use && for logical AND, || for logical OR, and % for remainders.",
        keyRules: [
          "Always use == for equality comparisons.",
          "Wrap multi-line branches in curly braces { } to avoid dangling-else bugs.",
          "In C, n % 2 can be -1 for negative odd numbers, so n % 2 == 0 is the safest even check.",
        ],
        syntaxSnippet: `if (n % 2 == 0) {\n    printf("Even\\n");\n} else {\n    printf("Odd\\n");\n}`,
        exampleTitle: "Example: Classifying numbers with if / else in C",
        exampleCode: `#include <stdio.h>\n\nint main(void) {\n    int nums[] = {12, 7, 0};\n    for (int i = 0; i < 3; i++) {\n        int n = nums[i];\n        const char *parity = (n % 2 == 0) ? "Even" : "Odd";\n        const char *sign = (n > 0) ? "positive" : (n < 0 ? "negative" : "zero");\n        printf("%d is %s and %s\\n", n, parity, sign);\n    }\n    return 0;\n}\n`,
        expectedOutput: `12 is Even and positive\n7 is Odd and positive\n0 is Even and zero\n`,
        exercise: {
          prompt: "Fill in the logical AND operator in C:",
          codeTemplate: `if (n > 0 ___ n % 2 == 0) {\n    printf("Positive even\\n");\n}`,
          answer: "&&",
          hint: "Logical AND in C is written with two ampersands: &&.",
        },
      },
    },
  },
  {
    id: "user-input",
    number: "06",
    title: "Reading Standard Input (stdin)",
    shortTitle: "User Input (stdin)",
    summary: "Read numbers, arrays, and lines from standard input the way automated judges pass test cases.",
    tags: ["input", "stdin", "io", "scanner", "cin", "scanf"],
    lessons: {
      python: {
        headline: "Python input() & sys.stdin",
        intro:
          "Automated judges feed test data through standard input (stdin). Never pass a prompt string like input(\"Enter n:\") because that prompt gets printed to stdout and causes a Wrong Answer! Use input().split() or sys.stdin.read().split().",
        keyRules: [
          "Call input() with NO arguments so no extra prompt text is printed.",
          "a, b = map(int, input().split()) reads two space-separated integers on one line.",
          "arr = list(map(int, input().split())) reads a whole line of integers into a list.",
        ],
        syntaxSnippet: `import sys\ntokens = sys.stdin.read().split()\na = int(tokens[0])\nb = int(tokens[1])\nprint(a + b)`,
        exampleTitle: "Example: Reading an array of numbers from stdin in Python",
        exampleCode: `import sys\n\ndata = list(map(int, sys.stdin.read().split()))\nif data:\n    n = data[0]\n    nums = data[1:1 + n]\n    print("Count:", n)\n    print("Sum:", sum(nums))\n    print("Reversed:", *reversed(nums))\n`,
        exampleStdin: `4\n10 20 30 40`,
        expectedOutput: `Count: 4\nSum: 100\nReversed: 40 30 20 10\n`,
        exercise: {
          prompt: "Fill in the string method that splits a line of whitespace-separated tokens into a list:",
          codeTemplate: `tokens = input().___()`,
          answer: "split",
          hint: "Use .split() to break a string on whitespace.",
        },
      },
      java: {
        headline: "Java Scanner & Standard Input",
        intro:
          "In Java, java.util.Scanner reads tokens from System.in. Use sc.nextInt() for integers, sc.nextLong() for 64-bit integers, sc.next() for a single word, and sc.nextLine() for a full line.",
        keyRules: [
          "Import java.util.Scanner; at the top of your file.",
          "sc.hasNextInt() safely checks if another integer is available in stdin.",
          "Loop i from 0 to n - 1 with arr[i] = sc.nextInt() to read an array.",
        ],
        syntaxSnippet: `import java.util.Scanner;\nScanner sc = new Scanner(System.in);\nint n = sc.nextInt();`,
        exampleTitle: "Example: Reading N integers into an array with Scanner",
        exampleCode: `import java.util.Scanner;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (!sc.hasNextInt()) return;\n        int n = sc.nextInt();\n        int[] nums = new int[n];\n        int sum = 0;\n        for (int i = 0; i < n; i++) {\n            nums[i] = sc.nextInt();\n            sum += nums[i];\n        }\n        System.out.println("Count: " + n);\n        System.out.println("Sum: " + sum);\n        System.out.print("Reversed: ");\n        for (int i = n - 1; i >= 0; i--) {\n            System.out.print(nums[i] + (i > 0 ? " " : "\\n"));\n        }\n    }\n}\n`,
        exampleStdin: `4\n10 20 30 40`,
        expectedOutput: `Count: 4\nSum: 100\nReversed: 40 30 20 10\n`,
        exercise: {
          prompt: "Fill in the Scanner method that reads the next int from standard input:",
          codeTemplate: `Scanner sc = new Scanner(System.in);\nint n = sc.___();`,
          answer: "nextInt",
          hint: "Scanner uses nextInt() to read an integer token.",
        },
      },
      cpp: {
        headline: "C++ std::cin & Fast Input",
        intro:
          "In C++, std::cin >> x skips leading whitespace (spaces and newlines) and reads the next value directly into x. You can chain multiple reads like std::cin >> a >> b;.",
        keyRules: [
          "std::cin >> n returns truthy when a value was read successfully.",
          "Use std::getline(std::cin, line) when you need to read an entire line including spaces.",
          "Read an N-element vector by creating std::vector<int> v(n); and looping std::cin >> v[i];.",
        ],
        syntaxSnippet: `int n;\nstd::cin >> n;\nstd::vector<int> nums(n);\nfor (int i = 0; i < n; i++) std::cin >> nums[i];`,
        exampleTitle: "Example: Reading N integers and reversing them in C++",
        exampleCode: `#include <iostream>\n#include <vector>\n\nint main() {\n    int n;\n    if (!(std::cin >> n)) return 0;\n    std::vector<int> nums(n);\n    int sum = 0;\n    for (int i = 0; i < n; i++) {\n        std::cin >> nums[i];\n        sum += nums[i];\n    }\n    std::cout << "Count: " << n << '\\n';\n    std::cout << "Sum: " << sum << '\\n';\n    std::cout << "Reversed: ";\n    for (int i = n - 1; i >= 0; i--) {\n        std::cout << nums[i] << (i > 0 ? ' ' : '\\n');\n    }\n    return 0;\n}\n`,
        exampleStdin: `4\n10 20 30 40`,
        expectedOutput: `Count: 4\nSum: 100\nReversed: 40 30 20 10\n`,
        exercise: {
          prompt: "Fill in the C++ standard input stream object:",
          codeTemplate: `int n;\nstd::___ >> n;`,
          answer: "cin",
          hint: "Character input in C++ is std::cin.",
        },
      },
      c: {
        headline: "C scanf() & Address Operator (&)",
        intro:
          "In C, scanf(\"%d\", &n) reads an integer from standard input into the variable n. Notice the address-of operator (&) before n — scanf needs the memory address of the variable so it can store the value there.",
        keyRules: [
          "Always pass &variable to scanf for numeric types (e.g., scanf(\"%d\", &n)).",
          "scanf returns the number of items successfully read (e.g., == 1).",
          "%d automatically skips spaces and newlines before the number.",
        ],
        syntaxSnippet: `int n;\nif (scanf("%d", &n) == 1) {\n    printf("Read %d\\n", n);\n}`,
        exampleTitle: "Example: Reading N integers from stdin with scanf in C",
        exampleCode: `#include <stdio.h>\n\nint main(void) {\n    int n;\n    if (scanf("%d", &n) != 1 || n <= 0 || n > 100) return 0;\n    int nums[100];\n    int sum = 0;\n    for (int i = 0; i < n; i++) {\n        scanf("%d", &nums[i]);\n        sum += nums[i];\n    }\n    printf("Count: %d\\n", n);\n    printf("Sum: %d\\n", sum);\n    printf("Reversed: ");\n    for (int i = n - 1; i >= 0; i--) {\n        printf("%d%c", nums[i], i > 0 ? ' ' : '\\n');\n    }\n    return 0;\n}\n`,
        exampleStdin: `4\n10 20 30 40`,
        expectedOutput: `Count: 4\nSum: 100\nReversed: 40 30 20 10\n`,
        exercise: {
          prompt: "Fill in the C function that reads formatted input from stdin:",
          codeTemplate: `int n;\n___("%d", &n);`,
          answer: "scanf",
          hint: "C uses scanf from <stdio.h> to scan formatted input.",
        },
      },
    },
  },
  {
    id: "strings",
    number: "07",
    title: "Strings & Text Manipulation",
    shortTitle: "Strings",
    summary: "Inspect characters, measure string length, slice substrings, and transform text.",
    tags: ["string", "strings", "characters", "text"],
    lessons: {
      python: {
        headline: "Python Strings & Slicing",
        intro:
          "Python strings are sequences of characters. You can index them (s[0]), measure length with len(s), change case with .upper() / .lower(), and reverse a string in one expression with s[::-1].",
        keyRules: [
          "s[a:b] slices characters from index a up to b - 1.",
          "s[::-1] returns a reversed copy of the string.",
          "Strings are immutable in Python — methods like s.upper() return a new string.",
        ],
        syntaxSnippet: `s = "exeku"\nprint(len(s))     # 5\nprint(s.upper())  # EXEKU\nprint(s[::-1])    # ukexe`,
        exampleTitle: "Example: String length, uppercase, and reversal in Python",
        exampleCode: `word = "Exeku"\n\nprint("Original:", word)\nprint("Length:", len(word))\nprint("Uppercase:", word.upper())\nprint("Reversed:", word[::-1])\n`,
        expectedOutput: `Original: Exeku\nLength: 5\nUppercase: EXEKU\nReversed: ukexE\n`,
        exercise: {
          prompt: "Fill in the string method that converts all letters to uppercase in Python:",
          codeTemplate: `word = "exeku"\nprint(word.___())`,
          answer: "upper",
          hint: "Call .upper() on a Python string.",
        },
      },
      java: {
        headline: "Java Strings & StringBuilder",
        intro:
          "Java's String class provides .length(), .charAt(i), .substring(a, b), and .toUpperCase(). To reverse or build strings inside a loop, use StringBuilder.",
        keyRules: [
          "Use s.charAt(i) instead of s[i] to read a character in Java.",
          "Always compare string contents with s1.equals(s2), never s1 == s2.",
          "new StringBuilder(s).reverse().toString() reverses a string cleanly.",
        ],
        syntaxSnippet: `String s = "Exeku";\nSystem.out.println(s.length());\nSystem.out.println(s.charAt(0));`,
        exampleTitle: "Example: String methods and StringBuilder reversal in Java",
        exampleCode: `public class Main {\n    public static void main(String[] args) {\n        String word = "Exeku";\n        String reversed = new StringBuilder(word).reverse().toString();\n\n        System.out.println("Original: " + word);\n        System.out.println("Length: " + word.length());\n        System.out.println("Uppercase: " + word.toUpperCase());\n        System.out.println("Reversed: " + reversed);\n    }\n}\n`,
        expectedOutput: `Original: Exeku\nLength: 5\nUppercase: EXEKU\nReversed: ukexE\n`,
        exercise: {
          prompt: "Fill in the Java String method that returns the character at index 0:",
          codeTemplate: `String s = "Exeku";\nchar first = s.___(0);`,
          answer: "charAt",
          hint: "Java strings use .charAt(index).",
        },
      },
      cpp: {
        headline: "C++ std::string & <algorithm>",
        intro:
          "C++ std::string supports s.size(), 0-based indexing s[i], s.substr(pos, len), and fast in-place reversal with std::reverse(s.begin(), s.end()) from <algorithm>.",
        keyRules: [
          "Unlike Java, std::string in C++ is mutable — you can modify s[i] directly.",
          "s1 == s2 compares string contents directly in C++.",
          "Include <cctype> for std::toupper(c) and std::tolower(c).",
        ],
        syntaxSnippet: `#include <algorithm>\n#include <string>\nstd::string s = "Exeku";\nstd::reverse(s.begin(), s.end());`,
        exampleTitle: "Example: Transforming and reversing std::string in C++",
        exampleCode: `#include <algorithm>\n#include <cctype>\n#include <iostream>\n#include <string>\n\nint main() {\n    std::string word = "Exeku";\n    std::string upper = word;\n    for (char &c : upper) c = static_cast<char>(std::toupper(static_cast<unsigned char>(c)));\n    std::string rev = word;\n    std::reverse(rev.begin(), rev.end());\n\n    std::cout << "Original: " << word << '\\n';\n    std::cout << "Length: " << word.size() << '\\n';\n    std::cout << "Uppercase: " << upper << '\\n';\n    std::cout << "Reversed: " << rev << '\\n';\n    return 0;\n}\n`,
        expectedOutput: `Original: Exeku\nLength: 5\nUppercase: EXEKU\nReversed: ukexE\n`,
        exercise: {
          prompt: "Fill in the <algorithm> function that reverses a range from .begin() to .end():",
          codeTemplate: `std::___(s.begin(), s.end());`,
          answer: "reverse",
          hint: "Use std::reverse(s.begin(), s.end()).",
        },
      },
      c: {
        headline: "C Strings (<string.h> & char arrays)",
        intro:
          "In C, a string is a char array ending with a null terminator ('\\0'). Include <string.h> for strlen(s) and strcmp(a, b), and <ctype.h> for toupper(c).",
        keyRules: [
          "strlen(s) counts characters up to (but not including) the '\\0' byte.",
          "Always allocate 1 extra byte in char arrays for the null terminator '\\0'.",
          "Use strcmp(a, b) == 0 to check if two C strings are equal.",
        ],
        syntaxSnippet: `#include <string.h>\nchar s[] = "Exeku";\nint len = (int)strlen(s);`,
        exampleTitle: "Example: Measuring, uppercasing, and reversing a C string",
        exampleCode: `#include <ctype.h>\n#include <stdio.h>\n#include <string.h>\n\nint main(void) {\n    const char *word = "Exeku";\n    int len = (int)strlen(word);\n\n    printf("Original: %s\\n", word);\n    printf("Length: %d\\n", len);\n\n    printf("Uppercase: ");\n    for (int i = 0; i < len; i++) putchar(toupper((unsigned char)word[i]));\n    putchar('\\n');\n\n    printf("Reversed: ");\n    for (int i = len - 1; i >= 0; i--) putchar(word[i]);\n    putchar('\\n');\n    return 0;\n}\n`,
        expectedOutput: `Original: Exeku\nLength: 5\nUppercase: EXEKU\nReversed: ukexE\n`,
        exercise: {
          prompt: "Fill in the <string.h> function that returns the length of a C string:",
          codeTemplate: `int n = (int)___("Exeku");`,
          answer: "strlen",
          hint: "String length in <string.h> is strlen(...).",
        },
      },
    },
  },
  {
    id: "functions",
    number: "08",
    title: "Functions & Reusable Logic",
    shortTitle: "Functions",
    summary: "Break problems into clean, testable helper functions that take parameters and return results.",
    tags: ["functions", "methods", "return", "parameters"],
    lessons: {
      python: {
        headline: "Python Functions (def & return)",
        intro:
          "Define a function in Python with the def keyword, parameter names in parentheses, and a colon. Use return to send a computed result back to the caller.",
        keyRules: [
          "def function_name(param1, param2): starts a function definition.",
          "Indent the function body by 4 spaces.",
          "A function without a return statement returns None.",
        ],
        syntaxSnippet: `def max_In_list(nums):\n    best = nums[0]\n    for x in nums:\n        if x > best:\n            best = x\n    return best`,
        exampleTitle: "Example: Writing a function to find the maximum in an array",
        exampleCode: `def array_max(nums):\n    best = nums[0]\n    for x in nums:\n        if x > best:\n            best = x\n    return best\n\nsample = [14, 29, 7, 42, 18]\nprint("Array:", *sample)\nprint("Maximum value:", array_max(sample))\n`,
        expectedOutput: `Array: 14 29 7 42 18\nMaximum value: 42\n`,
        exercise: {
          prompt: "Fill in the keyword used to define a function in Python:",
          codeTemplate: `___ square(x):\n    return x * x`,
          answer: "def",
          hint: "Python functions start with the 3-letter keyword def.",
        },
      },
      java: {
        headline: "Java Static Helper Methods",
        intro:
          "Inside class Main, declare helper methods as static with their return type before the method name (e.g., static int arrayMax(int[] nums)) so main() can call them directly.",
        keyRules: [
          "Specify the return type (like int, boolean, String, or void if nothing is returned).",
          "Mark helper methods static when calling them from public static void main.",
          "Use return value; to send back the answer.",
        ],
        syntaxSnippet: `static int square(int x) {\n    return x * x;\n}`,
        exampleTitle: "Example: Static helper method finding the maximum of an array",
        exampleCode: `public class Main {\n    static int arrayMax(int[] nums) {\n        int best = nums[0];\n        for (int x : nums) {\n            if (x > best) best = x;\n        }\n        return best;\n    }\n\n    public static void main(String[] args) {\n        int[] sample = {14, 29, 7, 42, 18};\n        System.out.println("Maximum value: " + arrayMax(sample));\n    }\n}\n`,
        expectedOutput: `Maximum value: 42\n`,
        exercise: {
          prompt: "Fill in the keyword that sends a computed value back from a method:",
          codeTemplate: `static int square(int x) {\n    ___ x * x;\n}`,
          answer: "return",
          hint: "Use the return keyword.",
        },
      },
      cpp: {
        headline: "C++ Functions & Pass by Const Reference",
        intro:
          "In C++, define helper functions above main(). When passing a std::vector or std::string that the function only reads, pass it by const reference (const std::vector<int>& nums) so C++ doesn't copy the entire array.",
        keyRules: [
          "Place helper functions before int main() so they are in scope.",
          "const std::vector<int>& avoids copying large arrays.",
          "The return type comes first: int arrayMax(...).",
        ],
        syntaxSnippet: `int arrayMax(const std::vector<int>& nums) {\n    int best = nums[0];\n    for (int x : nums) if (x > best) best = x;\n    return best;\n}`,
        exampleTitle: "Example: Function taking a vector by const reference in C++",
        exampleCode: `#include <iostream>\n#include <vector>\n\nint arrayMax(const std::vector<int>& nums) {\n    int best = nums[0];\n    for (int x : nums) {\n        if (x > best) best = x;\n    }\n    return best;\n}\n\nint main() {\n    std::vector<int> sample = {14, 29, 7, 42, 18};\n    std::cout << "Maximum value: " << arrayMax(sample) << '\\n';\n    return 0;\n}\n`,
        expectedOutput: `Maximum value: 42\n`,
        exercise: {
          prompt: "Fill in the keyword that sends the result back to the caller:",
          codeTemplate: `int square(int x) {\n    ___ x * x;\n}`,
          answer: "return",
          hint: "Use the return keyword.",
        },
      },
      c: {
        headline: "C Functions & Array Parameters",
        intro:
          "In C, when you pass an array to a function (int arrayMax(const int nums[], int n)), always pass its length n as a second parameter because the array decays to a pointer.",
        keyRules: [
          "Define helper functions above main(void).",
          "Pass both the array pointer and the element count n.",
          "Mark read-only array parameters const int nums[] for safety.",
        ],
        syntaxSnippet: `int arrayMax(const int nums[], int n) {\n    int best = nums[0];\n    for (int i = 1; i < n; i++) if (nums[i] > best) best = nums[i];\n    return best;\n}`,
        exampleTitle: "Example: Helper function finding the maximum of a C array",
        exampleCode: `#include <stdio.h>\n\nint arrayMax(const int nums[], int n) {\n    int best = nums[0];\n    for (int i = 1; i < n; i++) {\n        if (nums[i] > best) best = nums[i];\n    }\n    return best;\n}\n\nint main(void) {\n    int sample[] = {14, 29, 7, 42, 18};\n    printf("Maximum value: %d\\n", arrayMax(sample, 5));\n    return 0;\n}\n`,
        expectedOutput: `Maximum value: 42\n`,
        exercise: {
          prompt: "Fill in the return type of a C function that returns an integer:",
          codeTemplate: `___ square(int x) {\n    return x * x;\n}`,
          answer: "int",
          hint: "Functions returning a standard integer begin with int.",
        },
      },
    },
  },
];

export function findLearnChapterById(id?: string | null): LearnChapter | null {
  if (!id) return null;
  return LEARN_CHAPTERS.find((c) => c.id === id) ?? null;
}

export function getLearnChapter(id?: string | null): LearnChapter {
  return findLearnChapterById(id) ?? LEARN_CHAPTERS[0];
}

export function checkExerciseAnswer(lesson: LanguageLesson, rawInput: string): boolean {
  const cleaned = rawInput.trim();
  if (!cleaned) return false;
  const accepted = lesson.exercise.acceptedAnswers ?? [lesson.exercise.answer];
  return accepted.some((ans) => ans.trim() === cleaned);
}
