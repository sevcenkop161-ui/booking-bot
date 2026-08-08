// Section 46: every status must be visually distinct without using an
// excessive number of colors — five statuses, five colors, that's it.
// Colors come from CSS variables (globals.css) with separate light/dark
// values, rather than literal Tailwind palette classes, so they stay
// legible against a near-black background too.
const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-status-pending-bg text-status-pending-text",
  CONFIRMED: "bg-status-confirmed-bg text-status-confirmed-text",
  CANCELLED: "bg-status-cancelled-bg text-status-cancelled-text",
  COMPLETED: "bg-status-completed-bg text-status-completed-text",
  NO_SHOW: "bg-status-noshow-bg text-status-noshow-text",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Ожидает",
  CONFIRMED: "Подтверждено",
  CANCELLED: "Отменено",
  COMPLETED: "Завершено",
  NO_SHOW: "Не пришёл",
};

export function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? "bg-background-secondary text-foreground";
  const label = STATUS_LABELS[status] ?? status;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${style}`}>
      {label}
    </span>
  );
}
