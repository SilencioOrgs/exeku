const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export const MIN_ACCOUNT_AGE = 13;
export const MAX_ACCOUNT_AGE = 100;

/** Computes exact age in whole years from a strict YYYY-MM-DD birthday, or null if invalid. */
export function computeAgeFromBirthday(birthday: string, now: Date = new Date()): number | null {
  const match = ISO_DATE.exec(birthday.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  // Reject impossible calendar dates like 2005-02-30.
  const check = new Date(Date.UTC(year, month - 1, day));
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day
  ) {
    return null;
  }

  const todayYear = now.getFullYear();
  const todayMonth = now.getMonth() + 1;
  const todayDay = now.getDate();

  let age = todayYear - year;
  if (todayMonth < month || (todayMonth === month && todayDay < day)) {
    age -= 1;
  }
  return age;
}

function formatIsoDate(year: number, month: number, day: number): string {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Valid min/max YYYY-MM-DD bounds for the birthday picker (13 to 100 years old). */
export function birthdayBounds(now: Date = new Date()): { min: string; max: string } {
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const clampDay = (targetYear: number) => Math.min(day, new Date(Date.UTC(targetYear, month, 0)).getUTCDate());
  return {
    min: formatIsoDate(year - MAX_ACCOUNT_AGE, month, clampDay(year - MAX_ACCOUNT_AGE)),
    max: formatIsoDate(year - MIN_ACCOUNT_AGE, month, clampDay(year - MIN_ACCOUNT_AGE)),
  };
}
