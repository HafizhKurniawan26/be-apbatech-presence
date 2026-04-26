// src/utils/time.validator.ts

/**
 * Parse time string (HH:mm) ke Date object untuk hari ini
 */
export function parseTimeString(timeStr: string): Date {
  const [hours, minutes] = timeStr.split(":").map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
}

/**
 * Cek apakah check-in tepat waktu atau terlambat
 */
export function checkAttendanceStatus(
  checkInTime: Date,
  scheduledTime: string,
  toleranceMinutes: number = 0, // Bisa ditambahkan toleransi keterlambatan
): "ontime" | "late" {
  const scheduled = parseTimeString(scheduledTime);
  const scheduledWithTolerance = new Date(
    scheduled.getTime() + toleranceMinutes * 60000,
  );

  return checkInTime <= scheduledWithTolerance ? "ontime" : "late";
}

/**
 * Format time untuk display
 */
export function formatTime(date: Date): string {
  return date.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/**
 * Format date untuk display
 */
export function formatDate(date: Date): string {
  return date.toLocaleDateString("id-ID", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Validasi apakah sudah pernah check-in hari ini
 */
export function isAlreadyCheckedIn(
  todayAttendances: Array<{ checkIn: Date }>,
): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return todayAttendances.some((attendance) => {
    const checkInDate = new Date(attendance.checkIn);
    checkInDate.setHours(0, 0, 0, 0);
    return checkInDate.getTime() === today.getTime();
  });
}
