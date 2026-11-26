import test from "node:test";
import assert from "node:assert/strict";
import {
  appendInteractiveInput,
  detectStdinUsage,
  extractStdoutDelta,
  isAwaitingStdin,
} from "../lib/execution/stdin-interactive.ts";

test("detectStdinUsage classifies Python interactive input(), batch sys.stdin, and no-stdin code", () => {
  assert.equal(detectStdinUsage("python", [{ content: 'name = input("Enter name: ")\nprint(name)' }]), "interactive");
  assert.equal(detectStdinUsage("python", [{ content: "import sys\ndata = sys.stdin.read()\nprint(data)" }]), "prompt");
  assert.equal(detectStdinUsage("python", [{ content: "import sys\ninput = sys.stdin.readline\nprint(input())" }]), "prompt");
  assert.equal(detectStdinUsage("python", [{ content: "with open(0) as f:\n  print(f.read())" }]), "prompt");
  assert.equal(detectStdinUsage("python", [{ content: 'print("hello world")' }]), "none");
  // Comments and string literals must not trigger false positives
  assert.equal(detectStdinUsage("python", [{ content: '# name = input("Enter: ")\nprint("call input() here")' }]), "none");
  // Method named .input() on an object is not built-in input()
  assert.equal(detectStdinUsage("python", [{ content: "obj.input(42)" }]), "none");
});

test("detectStdinUsage classifies Java Scanner vs BufferedReader/hasNext and ignores comments/strings", () => {
  assert.equal(
    detectStdinUsage("java", [{
      content: `import java.util.Scanner;
public class Main {
  public static void main(String[] args) {
    Scanner sc = new Scanner(System.in);
    String s = sc.nextLine();
    System.out.println(s);
  }
}`,
    }]),
    "interactive",
  );

  // Guarded with hasNext() does not throw on EOF -> prompt upfront
  assert.equal(
    detectStdinUsage("java", [{
      content: `import java.util.Scanner;
public class Main {
  public static void main(String[] args) {
    Scanner sc = new Scanner(System.in);
    while (sc.hasNextInt()) System.out.println(sc.nextInt());
  }
}`,
    }]),
    "prompt",
  );

  assert.equal(
    detectStdinUsage("java", [{
      content: `import java.io.*;
public class Main {
  public static void main(String[] args) throws Exception {
    BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
    System.out.println(br.readLine());
  }
}`,
    }]),
    "prompt",
  );

  assert.equal(
    detectStdinUsage("java", [{
      content: `public class Main {
  public static void main(String[] args) {
    // new Scanner(System.in).nextLine();
    System.out.println("Scanner(System.in)");
  }
}`,
    }]),
    "none",
  );
});

test("detectStdinUsage detects C++ and C stdin reads across multiple files and ignores comments/strings", () => {
  assert.equal(detectStdinUsage("cpp", [{ content: "#include <iostream>\nint main(){ int x; std::cin >> x; }" }]), "prompt");
  assert.equal(detectStdinUsage("cpp", [{ content: "#include <iostream>\nusing namespace std;\nint main(){ string s; getline(cin, s); }" }]), "prompt");
  assert.equal(detectStdinUsage("cpp", [{ content: '#include <iostream>\nint main(){ /* cin >> x; */ std::cout << "cin >> x"; }' }]), "none");

  assert.equal(detectStdinUsage("c", [{ content: "#include <stdio.h>\nint main(){ int x; scanf(\"%d\", &x); }" }]), "prompt");
  assert.equal(detectStdinUsage("c", [{ content: "#include <stdio.h>\nint main(){ char b[32]; fgets(b, 32, stdin); }" }]), "prompt");
  assert.equal(detectStdinUsage("c", [{ content: '#include <stdio.h>\nint main(){ printf("scanf(%%d)\\n"); }' }]), "none");
  // Multi-file: helper file reads stdin
  assert.equal(
    detectStdinUsage("cpp", [
      { content: '#include "io.hpp"\nint main(){ read_all(); }' },
      { content: "#include <iostream>\nvoid read_all(){ int x; std::cin >> x; }" },
    ]),
    "prompt",
  );
});

test("isAwaitingStdin matches EOF runtime errors for Python and Java Scanner only", () => {
  const base = { exitCode: 1, stdout: "Enter name: ", durationMs: 12 };
  assert.equal(
    isAwaitingStdin("python", { ...base, status: "RUNTIME_ERROR", stderr: 'Traceback:\n  File "main.py", line 1\nEOFError: EOF when reading a line\n' }),
    true,
  );
  assert.equal(
    isAwaitingStdin("python", { ...base, status: "RUNTIME_ERROR", stderr: "ValueError: invalid literal for int() with base 10: 'abc'\n" }),
    false,
  );
  assert.equal(
    isAwaitingStdin("java", {
      ...base,
      status: "RUNTIME_ERROR",
      stderr: 'Exception in thread "main" java.util.NoSuchElementException: No line found\n\tat java.base/java.util.Scanner.nextLine(Scanner.java:1651)\n',
    }),
    true,
  );
  assert.equal(
    isAwaitingStdin("java", { ...base, status: "RUNTIME_ERROR", stderr: "java.lang.NullPointerException" }),
    false,
  );
  assert.equal(
    isAwaitingStdin("python", { ...base, status: "SERVICE_UNAVAILABLE", stderr: "EOFError" }),
    false,
  );
  assert.equal(
    isAwaitingStdin("cpp", { ...base, status: "RUNTIME_ERROR", stderr: "EOFError" }),
    false,
  );
});

test("extractStdoutDelta and appendInteractiveInput preserve terminal transcripts cleanly", () => {
  assert.deepEqual(extractStdoutDelta("", "Enter name: "), { delta: "Enter name: ", prefixMatched: true });
  assert.deepEqual(extractStdoutDelta("Enter name: ", "Enter name: Enter age: "), { delta: "Enter age: ", prefixMatched: true });
  assert.deepEqual(extractStdoutDelta("Random: 12\n", "Random: 99\nDone\n"), { delta: "Random: 99\nDone\n", prefixMatched: false });

  assert.deepEqual(appendInteractiveInput("", "Alice"), { nextStdin: "Alice\n", displayInput: "Alice" });
  assert.deepEqual(appendInteractiveInput("Alice\n", "20\r\n30\r\n"), { nextStdin: "Alice\n20\n30\n", displayInput: "20\n30" });
});
