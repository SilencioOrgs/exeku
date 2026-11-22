type ClassValue = string | false | null | undefined;

export function cn(...inputs: ClassValue[]): string;
export function cn<S>(...inputs: (ClassValue | ((state: S) => string | undefined))[]): string | ((state: S) => string);
export function cn<S>(...inputs: (ClassValue | ((state: S) => string | undefined))[]): string | ((state: S) => string) {
  if (inputs.some((value) => typeof value === "function")) {
    return (state: S) =>
      inputs
        .map((value) => (typeof value === "function" ? value(state) : value))
        .filter(Boolean)
        .join(" ");
  }
  return inputs.filter(Boolean).join(" ");
}
