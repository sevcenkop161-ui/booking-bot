import { InlineKeyboard } from "grammy";
import { formatPrice } from "@/lib/telegram/formatters";
import type { ArtistListItem, ServiceListItem } from "@/lib/telegram/queries";

export function serviceKeyboard(services: ServiceListItem[]): InlineKeyboard {
  const keyboard = new InlineKeyboard();
  for (const service of services) {
    keyboard.text(`${service.name} — ${formatPrice(service.price)}`, `svc:${service.id}`).row();
  }
  return keyboard.text("❌ Отмена", "cancel");
}

export function artistKeyboard(artists: ArtistListItem[]): InlineKeyboard {
  const keyboard = new InlineKeyboard();
  for (const artist of artists) {
    const label = artist.specialization ? `${artist.name} — ${artist.specialization}` : artist.name;
    keyboard.text(label, `artist:${artist.id}`).row();
  }
  return keyboard.text("← Назад", "back:service").text("❌ Отмена", "cancel");
}

export interface DateOption {
  date: string; // "YYYY-MM-DD"
  label: string; // "Пн, 10 авг"
}

export function dateKeyboard(dates: DateOption[]): InlineKeyboard {
  const keyboard = new InlineKeyboard();
  dates.forEach((option, index) => {
    keyboard.text(option.label, `date:${option.date}`);
    if (index % 2 === 1) keyboard.row();
  });
  if (dates.length % 2 === 1) keyboard.row();
  return keyboard.text("← Назад", "back:artist").text("❌ Отмена", "cancel");
}

export function timeKeyboard(labels: string[]): InlineKeyboard {
  const keyboard = new InlineKeyboard();
  labels.forEach((label, index) => {
    keyboard.text(label, `time:${label}`);
    if (index % 3 === 2) keyboard.row();
  });
  if (labels.length % 3 !== 0) keyboard.row();
  return keyboard.text("← Назад", "back:date").text("❌ Отмена", "cancel");
}
