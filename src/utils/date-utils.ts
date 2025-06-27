import { startOfWeek, format, addDays, startOfYear, endOfYear } from "date-fns";

/**
 * Maximum number of weeks displayed in GitHub-style contribution grids
 * GitHub limits contribution maps to 53 weeks to maintain consistent layout
 */
const MAX_WEEKS = 53;

/**
 * Month names in lowercase for parsing user input (numbers or partial names)
 */
const MONTH_NAMES_LOWERCASE = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december"
];

/**
 * Month names in proper case for display purposes
 */
const MONTH_NAMES_DISPLAY = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

/**
 * Generates an array of week start dates for a calendar year.
 * Used to create the GitHub-style contribution grid structure where each week
 * represents a column in the visualization. Limits to 53 weeks maximum
 * to match GitHub's contribution map layout.
 */
export const getWeeksInYear = (year: number): Date[] => {
  const start = startOfYear(new Date(year, 0, 1));
  const end = endOfYear(new Date(year, 0, 1));
  const weeks: Date[] = [];

  let current = startOfWeek(start, { weekStartsOn: 0 }); // Sunday start

  while (current <= end) {
    weeks.push(current);
    current = addDays(current, 7);
  }

  return weeks.slice(0, MAX_WEEKS);
};

/**
 * Generates the 7 days of a week starting from a given date.
 * Used to populate each column in the contribution grid with individual day cells.
 * Each day will display Claude usage intensity for that date.
 */
export const getDaysInWeek = (weekStart: Date): Date[] => {
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    days.push(addDays(weekStart, i));
  }
  return days;
};

/**
 * Formats a Date object into YYYY-MM-DD string format.
 * This standardized format is used throughout the application for date keys
 * in maps and for consistent date comparison and display.
 */
export const formatDate = (date: Date): string => {
  return format(date, "yyyy-MM-dd");
};

/**
 * Converts a date string into a Date object.
 * Used for parsing timestamps from Claude usage data entries.
 */
export const parseDate = (dateString: string): Date => {
  return new Date(dateString);
};

/**
 * Checks if the given year matches the current year.
 * Used to determine default behavior and optimize data loading
 * for current year contribution maps.
 */
export const isCurrentYear = (year: number): boolean => {
  return year === new Date().getFullYear();
};

/**
 * Returns the current year as the default for contribution maps.
 * When no year is specified, the tool defaults to showing current year
 * Claude usage patterns.
 */
export const getDefaultYear = (): number => {
  return new Date().getFullYear();
};

/**
 * Parses user input into a valid month number (1-12).
 * Supports both numeric input (1-12) and partial month names ("jan", "january").
 * Used for custom year ranges where users want to start their contribution
 * map from a specific month instead of January.
 */
export const parseMonth = (monthInput: string): number => {
  // Try parsing as number first
  const monthNum = parseInt(monthInput, 10);
  if (!isNaN(monthNum) && monthNum >= 1 && monthNum <= 12) {
    return monthNum;
  }

  // Try parsing as month name
  const monthIndex = MONTH_NAMES_LOWERCASE.findIndex((name) =>
    name.startsWith(monthInput.toLowerCase())
  );

  if (monthIndex !== -1) {
    return monthIndex + 1;
  }

  throw new Error(
    `Invalid month: ${monthInput}. Use 1-12 or month names like "January", "July", etc.`
  );
};

/**
 * Converts a month number (1-12) to its display name.
 * Used for generating date range labels in contribution map headers
 * and error messages throughout the application.
 */
export const getMonthName = (month: number): string => {
  if (month < 1 || month > 12) {
    throw new Error(`Invalid month number: ${month}. Must be 1-12.`);
  }

  return MONTH_NAMES_DISPLAY[month - 1];
};

/**
 * Generates week start dates for a custom 12-month period starting from any month.
 * Unlike getWeeksInYear which always starts in January, this allows users to view
 * their Claude usage patterns for periods like "July 2024 - July 2025".
 * Essential for users who want to track usage across fiscal years or other
 * non-calendar year periods.
 */
export const getWeeksInCustomYear = (
  year: number,
  startMonth: number = 1
): Date[] => {
  // Calculate the date range from startMonth to startMonth of next year
  const startDate = new Date(year, startMonth - 1, 1); // First day of start month
  const endDate = new Date(year + 1, startMonth - 1, 0); // Last day of the month before start month next year

  const weeks: Date[] = [];
  let current = startOfWeek(startDate, { weekStartsOn: 0 }); // Sunday start

  while (current <= endDate) {
    weeks.push(current);
    current = addDays(current, 7);
  }

  return weeks.slice(0, MAX_WEEKS);
};
