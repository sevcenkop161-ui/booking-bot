// day_of_week follows Postgres EXTRACT(DOW ...): 0 = Sunday ... 6 = Saturday.
// This matches how the values are stored in working_hours/breaks, so no
// conversion is needed between the database and this module.

export interface WorkingHours {
  dayOfWeek: number;
  startTime: string; // "HH:mm", business-local
  endTime: string;
  isWorking: boolean;
}

export interface BreakPeriod {
  dayOfWeek: number;
  startTime: string; // "HH:mm", business-local
  endTime: string;
}

export interface TimeOffPeriod {
  startDate: string; // "YYYY-MM-DD", inclusive
  endDate: string; // "YYYY-MM-DD", inclusive
}

export interface ExistingBooking {
  startTime: string; // ISO instant (UTC)
  endTime: string;
}

export interface AvailabilityRules {
  bookingIntervalMinutes: number;
  minBookingNoticeMinutes: number;
  maxBookingDays: number;
}

// This function computes availability for a single artist. The caller is
// responsible for narrowing workingHours/breaks/timeOff/existingBookings
// down to that one artist before calling it.
export interface AvailabilityInput {
  date: string; // "YYYY-MM-DD", the business-local calendar date being queried
  businessTimezone: string; // IANA name, e.g. "Europe/Moscow"
  serviceDurationMinutes: number;
  workingHours: WorkingHours[]; // the artist's full week
  breaks: BreakPeriod[]; // the artist's full week
  timeOff: TimeOffPeriod[];
  existingBookings: ExistingBooking[]; // the artist's non-cancelled bookings
  rules: AvailabilityRules;
  now?: Date; // injectable for tests; defaults to the current time
}

export interface AvailableSlot {
  startTime: string; // ISO UTC instant — store this directly in bookings.start_time
  endTime: string;
  label: string; // "10:00", formatted in businessTimezone for display
}
