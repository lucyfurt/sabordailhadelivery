export function formatOrderNumber(date: Date, sequence: number): string {
  const yy = String(date.getFullYear()).slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const seq = String(sequence).padStart(4, "0");
  return `${yy}${mm}${dd}-${seq}`;
}

export function todayKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}
