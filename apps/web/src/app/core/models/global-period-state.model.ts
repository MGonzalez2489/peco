/**
 * Month selected as the app-wide financial context. The year and month are
 * stored separately so the navbar picker can navigate them independently.
 */
export interface GlobalPeriodState {
  /** Calendar year of the selected period (for example `2026`). */
  selectedYear: number;
  /** Calendar month of the selected period (`1` to `12`). */
  selectedMonth: number;
}
