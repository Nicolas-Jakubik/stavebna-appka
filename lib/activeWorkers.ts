/**
 * Employee status is current-state data. Only active workers are eligible for
 * new attendance and for today's/yesterday's missing-entry reminders.
 * Historical attendance and payroll queries must remain unfiltered.
 */
export function lenAktivniPracovnici<T extends { aktivny?: boolean | null }>(workers: T[]): T[] {
  return workers.filter(worker => worker.aktivny !== false)
}
