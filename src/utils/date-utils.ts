import { startOfWeek, format, addDays, startOfYear, endOfYear, differenceInWeeks } from 'date-fns';

export function getWeeksInYear(year: number): Date[] {
  const start = startOfYear(new Date(year, 0, 1));
  const end = endOfYear(new Date(year, 0, 1));
  const weeks: Date[] = [];
  
  let current = startOfWeek(start, { weekStartsOn: 0 }); // Sunday start
  
  while (current <= end) {
    weeks.push(current);
    current = addDays(current, 7);
  }
  
  return weeks.slice(0, 53); // GitHub shows max 53 weeks
}

export function getDaysInWeek(weekStart: Date): Date[] {
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    days.push(addDays(weekStart, i));
  }
  return days;
}

export function formatDate(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function parseDate(dateString: string): Date {
  return new Date(dateString);
}

export function isCurrentYear(year: number): boolean {
  return year === new Date().getFullYear();
}

export function getDefaultYear(): number {
  return new Date().getFullYear();
}