export function displayDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Unknown date" : new Intl.DateTimeFormat("en-US", {
    month: "short", day: "numeric", year: "numeric", timeZone: "UTC",
  }).format(date);
}

export function shortId(value: string) {
  return `${value.slice(0, 8)}…`;
}
