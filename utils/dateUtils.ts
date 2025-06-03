import { TFunction } from "i18next";

export type DateFormatType =
  | "long"
  | "short"
  | "monthYear"
  | "dayMonth"
  | "time"
  | "dateTime";

interface DateFormatOptions {
  type?: DateFormatType;
  locale?: string;
  t?: TFunction;
}

/**
 * Formats a date string according to the specified format type and locale
 * @param dateString - The date string to format
 * @param options - Formatting options including type, locale, and translation function
 * @returns Formatted date string
 */
export const formatDate = (
  dateString: string | Date,
  options: DateFormatOptions = {}
): string => {
  const { type = "long", locale = "en-US", t } = options;

  try {
    const date = dateString instanceof Date ? dateString : new Date(dateString);

    // Check if the date is valid
    if (isNaN(date.getTime())) {
      return "-";
    }

    // Default options for different format types
    const formatOptions: {
      [key in DateFormatType]: Intl.DateTimeFormatOptions;
    } = {
      long: {
        year: "numeric",
        month: "long",
        day: "numeric",
      },
      short: {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      },
      monthYear: {
        year: "numeric",
        month: "long",
      },
      dayMonth: {
        month: "long",
        day: "numeric",
      },
      time: {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      },
      dateTime: {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      },
    };

    // Get timezone from translations if available
    const timeZone = t ? t("common.dateFormat.timezone") : "UTC";

    // Create formatter with the specified options
    const formatter = new Intl.DateTimeFormat(locale, {
      ...formatOptions[type],
      timeZone,
    });

    return formatter.format(date);
  } catch (error) {
    console.error("Error formatting date:", error);
    return "-";
  }
};

/**
 * Formats a date relative to now (e.g., "2 days ago", "in 3 hours")
 * @param dateString - The date string to format
 * @param locale - The locale to use for formatting
 * @returns Relative time string
 */
export const formatRelativeTime = (
  dateString: string | Date,
  locale: string = "en-US"
): string => {
  try {
    const date = dateString instanceof Date ? dateString : new Date(dateString);

    if (isNaN(date.getTime())) {
      return "-";
    }

    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });

    if (Math.abs(diffInSeconds) < 60) {
      return rtf.format(-Math.floor(diffInSeconds), "seconds");
    }

    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (Math.abs(diffInMinutes) < 60) {
      return rtf.format(-diffInMinutes, "minutes");
    }

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (Math.abs(diffInHours) < 24) {
      return rtf.format(-diffInHours, "hours");
    }

    const diffInDays = Math.floor(diffInHours / 24);
    if (Math.abs(diffInDays) < 30) {
      return rtf.format(-diffInDays, "days");
    }

    const diffInMonths = Math.floor(diffInDays / 30);
    if (Math.abs(diffInMonths) < 12) {
      return rtf.format(-diffInMonths, "months");
    }

    const diffInYears = Math.floor(diffInDays / 365);
    return rtf.format(-diffInYears, "years");
  } catch (error) {
    console.error("Error formatting relative time:", error);
    return "-";
  }
};

/**
 * Checks if a date string is valid
 * @param dateString - The date string to validate
 * @returns boolean indicating if the date is valid
 */
export const isValidDate = (dateString: string | Date): boolean => {
  try {
    const date = dateString instanceof Date ? dateString : new Date(dateString);
    return !isNaN(date.getTime());
  } catch {
    return false;
  }
};

/**
 * Gets the start of a day (00:00:00) for a given date
 * @param date - The date to get the start of day for
 * @returns Date object set to start of day
 */
export const getStartOfDay = (date: Date): Date => {
  const newDate = new Date(date);
  newDate.setHours(0, 0, 0, 0);
  return newDate;
};

/**
 * Gets the end of a day (23:59:59) for a given date
 * @param date - The date to get the end of day for
 * @returns Date object set to end of day
 */
export const getEndOfDay = (date: Date): Date => {
  const newDate = new Date(date);
  newDate.setHours(23, 59, 59, 999);
  return newDate;
};
