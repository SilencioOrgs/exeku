export interface ValidationResult {
  isValid: boolean;
  trimmed?: string;
  error?: string;
}

const DISPLAY_NAME_REGEX = /^[a-zA-Z0-9_\- ]+$/;

/**
 * Validates a user display name according to Exeku specifications:
 * - Trim whitespace
 * - Length: 2 to 32 characters
 * - Alphanumeric, spaces, underscores, and dashes allowed
 */
export function validateDisplayName(name: string): ValidationResult {
  if (typeof name !== "string") {
    return {
      isValid: false,
      error: "Display name must be a string",
    };
  }

  const trimmed = name.trim();

  if (trimmed.length === 0) {
    return {
      isValid: false,
      error: "Display name cannot be empty",
    };
  }

  if (trimmed.length < 2) {
    return {
      isValid: false,
      error: "Display name must be at least 2 characters",
    };
  }

  if (trimmed.length > 32) {
    return {
      isValid: false,
      error: "Display name must be at most 32 characters",
    };
  }

  if (!DISPLAY_NAME_REGEX.test(trimmed)) {
    return {
      isValid: false,
      error: "Display name may only contain letters, numbers, spaces, underscores, and dashes",
    };
  }

  return {
    isValid: true,
    trimmed,
  };
}
