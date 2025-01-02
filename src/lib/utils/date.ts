export function formatDate(stringDate: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).formatToParts(new Date(stringDate));

  const day = parts.find((p) => p.type === "day")?.value ?? "";
  const month = parts.find((p) => p.type === "month")?.value?.toLowerCase() ?? "";
  const year = parts.find((p) => p.type === "year")?.value ?? "";

  return `${day} ${month} ${year}`;
}
