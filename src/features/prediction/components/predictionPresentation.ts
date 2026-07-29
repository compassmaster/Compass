/** Read Model values retain precision; decimal rounding belongs only to presentation. */
export function formatPredictionNumber(value: number | null) { return value === null ? '—' : value.toFixed(1); }
