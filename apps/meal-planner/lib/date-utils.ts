/**
 * Get the Monday of the week containing the given date string (YYYY-MM-DD).
 */
export function getWeekStart(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  const day = d.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return formatDate(d);
}

/**
 * Get an array of 7 date strings (Mon-Sun) for the week starting at weekStart.
 */
export function getWeekDates(weekStart: string): string[] {
  const dates: string[] = [];
  const d = new Date(weekStart + "T12:00:00");
  for (let i = 0; i < 7; i++) {
    dates.push(formatDate(d));
    d.setDate(d.getDate() + 1);
  }
  return dates;
}

/**
 * Format a Date object as YYYY-MM-DD.
 */
export function formatDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Get today's date as YYYY-MM-DD.
 */
export function today(): string {
  return formatDate(new Date());
}

/**
 * Get the day-of-week index (0=Monday .. 6=Sunday) for a YYYY-MM-DD string.
 */
export function getDayOfWeek(dateStr: string): number {
  const d = new Date(dateStr + "T12:00:00");
  const jsDay = d.getDay(); // 0=Sun
  return jsDay === 0 ? 6 : jsDay - 1;
}

/**
 * Get a human-readable day name.
 */
const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DAY_NAMES_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function getDayName(dayOfWeek: number): string {
  return DAY_NAMES[dayOfWeek] ?? "";
}

export function getDayNameShort(dayOfWeek: number): string {
  return DAY_NAMES_SHORT[dayOfWeek] ?? "";
}

/**
 * Shift a week start date by n weeks.
 */
export function shiftWeek(weekStart: string, weeks: number): string {
  const d = new Date(weekStart + "T12:00:00");
  d.setDate(d.getDate() + weeks * 7);
  return formatDate(d);
}

/**
 * Number of days between two YYYY-MM-DD date strings.
 */
export function daysBetween(a: string, b: string): number {
  const da = new Date(a + "T12:00:00");
  const db = new Date(b + "T12:00:00");
  return Math.round((db.getTime() - da.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Format a date string for display (e.g., "Mar 20").
 */
export function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
