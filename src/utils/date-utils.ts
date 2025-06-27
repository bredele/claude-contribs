import { startOfWeek, format, addDays, startOfYear, endOfYear } from "date-fns";

export const getWeeksInYear = (year: number): Date[] => {
  const start = startOfYear(new Date(year, 0, 1));
  const end = endOfYear(new Date(year, 0, 1));
  const weeks: Date[] = [];

  let current = startOfWeek(start, { weekStartsOn: 0 }); // Sunday start

  while (current <= end) {
    weeks.push(current);
    current = addDays(current, 7);
  }

  return weeks.slice(0, 53); // GitHub shows max 53 weeks
};

export const getDaysInWeek = (weekStart: Date): Date[] => {
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    days.push(addDays(weekStart, i));
  }
  return days;
};

export const formatDate = (date: Date): string => {
  return format(date, "yyyy-MM-dd");
};

export const parseDate = (dateString: string): Date => {
  return new Date(dateString);
};

export const isCurrentYear = (year: number): boolean => {
  return year === new Date().getFullYear();
};

export const getDefaultYear = (): number => {
  return new Date().getFullYear();
};

export const parseMonth = (monthInput: string): number => {
  // Try parsing as number first
  const monthNum = parseInt(monthInput, 10);
  if (!isNaN(monthNum) && monthNum >= 1 && monthNum <= 12) {
    return monthNum;
  }

  // Try parsing as month name
  const monthNames = [
    "january",
    "february",
    "march",
    "april",
    "may",
    "june",
    "july",
    "august",
    "september",
    "october",
    "november",
    "december",
  ];

  const monthIndex = monthNames.findIndex((name) =>
    name.startsWith(monthInput.toLowerCase())
  );

  if (monthIndex !== -1) {
    return monthIndex + 1;
  }

  throw new Error(
    `Invalid month: ${monthInput}. Use 1-12 or month names like "January", "July", etc.`
  );
};

export const getMonthName = (month: number): string => {
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  if (month < 1 || month > 12) {
    throw new Error(`Invalid month number: ${month}. Must be 1-12.`);
  }

  return monthNames[month - 1];
};

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

  return weeks.slice(0, 53); // GitHub shows max 53 weeks
};
