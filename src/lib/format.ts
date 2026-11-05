const dateFormat = new Intl.DateTimeFormat("nb-NO", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Europe/Oslo",
});

export function formatDate(iso: string): string {
  return dateFormat.format(new Date(iso));
}

export function epicTitle(slug: string): string {
  const text = slug.replaceAll("-", " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}
