/**
 * Src/utils/Helpers.ts & src/utils/Helpers.ts
 * Utility Helpers - Formatting, Filtering, Conversion
 */

import { APP_CONSTANTS } from "./Constants";

// Number Helpers

export const formatPercent = (value: number): string => `${Math.round(value)}%`;

export const formatBengaliNumber = (num: number): string => {
  const bengaliDigits = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
  return num
    .toString()
    .split("")
    .map((d) => {
      const digit = parseInt(d, 10);
      return isNaN(digit) ? d : bengaliDigits[digit];
    })
    .join("");
};

export const clamp = (value: number, min: number, max: number): number => {
  return Math.max(min, Math.min(max, value));
};

// Array Helpers

export const chunkArray = <T>(array: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
};

export const uniqueArray = <T>(array: T[]): T[] => {
  return Array.from(new Set(array));
};

// Range Filter Helper - Auto small->big or big->small
export const normalizeRange = (
  start: number | null,
  end: number | null
): { min: number | null; max: number | null } => {
  if (start === null || end === null) {
    return { min: start, max: end };
  }
  return {
    min: Math.min(start, end),
    max: Math.max(start, end),
  };
};

export const isInRange = (
  value: number,
  start: number | null,
  end: number | null
): boolean => {
  if (start === null && end === null) {
    return true;
  }
  if (start === null) {
    return value <= (end as number);
  }
  if (end === null) {
    return value >= start;
  }
  const { min, max } = normalizeRange(start, end);
  return value >= (min as number) && value <= (max as number);
};

// Text Helpers

export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength) + "...";
};

export const toEventCardDisplay = (
  chapterName: string,
  displayIds: number[]
): string => {
  const idStr = displayIds.map((id) => `#${id}`).join(", ");
  return `${chapterName} ${idStr}`;
};

// Progress Helpers

export const calculateProgressPercent = (
  completed: number,
  total: number
): number => {
  if (total === 0) {
    return 0;
  }
  return Math.round((completed / total) * 100);
};

export const getProgressColor = (percent: number): string => {
  if (percent >= 80) {
    return "#4CAF50";
  } // Green
  if (percent >= 50) {
    return "#FFC107";
  } // Yellow
  if (percent >= 20) {
    return "#FF9800";
  } // Orange
  return "#E0E0E0"; // Gray
};

// Bank Helpers

export const formatBankDisplay = (total: number, today: number): string => {
  return `ডেইলি ব্যাংক টোটাল ব্যালেন্স: ${total}% ক্রেডিট (আজকের অর্জন: +${today}% | মোট উপলব্ধ: ${total}%)`;
};

export const canAfford = (balance: number, cost: number): boolean => {
  return balance >= cost;
};

// Date Helpers

export const getTodayString = (): string => {
  return new Date().toISOString().split("T")[0];
};

export const isNewDay = (lastDate: string | null): boolean => {
  if (!lastDate) {
    return true;
  }
  return lastDate !== getTodayString();
};

export const getDaysDiff = (date1: string, date2: string): number => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// Dynamic Target Helpers

export const simulateActivity = (
  type: "high" | "medium" | "low" | "churn"
): { activity: number[]; counts: number[] } => {
  let activity: number[];
  let counts: number[];

  switch (type) {
    case "high":
      activity = [...Array(28).fill(1), 0, 1];
      counts = [...Array(30).fill(15)].map(
        () => 15 + Math.floor(Math.random() * 5)
      );
      break;
    case "medium":
      activity = Array(30)
        .fill(0)
        .map(() => (Math.random() > 0.5 ? 1 : 0));
      counts = Array(30)
        .fill(0)
        .map(() => Math.floor(Math.random() * 10));
      break;
    case "low":
      activity = Array(30)
        .fill(0)
        .map((_, i) => (i % 4 === 0 ? 1 : 0));
      counts = Array(30)
        .fill(0)
        .map(() => Math.floor(Math.random() * 3));
      break;
    case "churn":
      activity = [
        1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 1, 1, 1, 0, 1, 0, 1, 1, 0, 1, 1, 1, 1, 0,
        0, 1, 1, 1, 1, 1,
      ];
      counts = Array(30)
        .fill(0)
        .map(() => Math.floor(Math.random() * 8));
      break;
    default:
      activity = Array(30).fill(1);
      counts = Array(30).fill(10);
  }

  return { activity, counts };
};

// Validation Helpers

export const isValidChapterName = (name: string): boolean => {
  return name.trim().length > 0 && name.trim().length <= 50;
};

export const isValidRange = (
  start: number | null,
  end: number | null
): boolean => {
  if (start === null && end === null) {
    return true;
  }
  if (start !== null && (start < 0 || start > 10000)) {
    return false;
  }
  if (end !== null && (end < 0 || end > 10000)) {
    return false;
  }
  return true;
};

export default {
  formatPercent,
  formatBengaliNumber,
  clamp,
  chunkArray,
  uniqueArray,
  normalizeRange,
  isInRange,
  truncateText,
  toEventCardDisplay,
  calculateProgressPercent,
  getProgressColor,
  formatBankDisplay,
  canAfford,
  getTodayString,
  isNewDay,
  getDaysDiff,
  simulateActivity,
  isValidChapterName,
  isValidRange,
};
