import type { ArtistListItem, ServiceListItem } from "./queries";

// We send bot messages with parse_mode: "HTML", so any text coming from
// the database (names, descriptions) must be escaped before being
// embedded next to real markup like <b>.
export function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function formatPrice(price: number): string {
  if (price <= 0) return "бесплатно";
  return `${Math.round(price).toLocaleString("ru-RU")} ₽`;
}

export function formatServiceList(services: ServiceListItem[]): string {
  if (services.length === 0) {
    return "Пока нет доступных услуг.";
  }
  return services
    .map((service) => {
      const lines = [
        `<b>${escapeHtml(service.name)}</b> — ${formatPrice(service.price)}, ${service.duration_minutes} мин`,
      ];
      if (service.description) lines.push(escapeHtml(service.description));
      return lines.join("\n");
    })
    .join("\n\n");
}

export function formatArtistList(artists: ArtistListItem[]): string {
  if (artists.length === 0) {
    return "Пока нет доступных мастеров.";
  }
  return artists
    .map((artist) => {
      const heading = artist.specialization
        ? `<b>${escapeHtml(artist.name)}</b> — ${escapeHtml(artist.specialization)}`
        : `<b>${escapeHtml(artist.name)}</b>`;
      const lines = [heading];
      if (artist.bio) lines.push(escapeHtml(artist.bio));
      return lines.join("\n");
    })
    .join("\n\n");
}
