export function formatOrdinalDay(day: number) {
  if (day > 3 && day < 21) return `${day}th`;
  switch (day % 10) {
    case 1:
      return `${day}st`;
    case 2:
      return `${day}nd`;
    case 3:
      return `${day}rd`;
    default:
      return `${day}th`;
  }
}

export function formatLongDate(date: Date) {
  const month = date.toLocaleDateString("en-GB", { month: "long" });
  return `${formatOrdinalDay(date.getDate())} ${month} ${date.getFullYear()}`;
}

export function formatActivatedDisplay(timestamp = Date.now()) {
  const date = new Date(timestamp);
  const time = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return `Today at ${time}`;
}

export function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
