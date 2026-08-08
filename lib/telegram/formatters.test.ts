import { describe, expect, it } from "vitest";
import { escapeHtml, formatArtistList, formatPrice, formatServiceList } from "./formatters";

describe("escapeHtml", () => {
  it("escapes the characters that would break HTML parse_mode", () => {
    expect(escapeHtml("Tom & Jerry <3")).toBe("Tom &amp; Jerry &lt;3");
  });
});

describe("formatPrice", () => {
  it("formats a positive price with the ruble sign", () => {
    expect(formatPrice(8000)).toBe("8 000 ₽");
  });

  it("treats zero or negative prices as free", () => {
    expect(formatPrice(0)).toBe("бесплатно");
    expect(formatPrice(-1)).toBe("бесплатно");
  });
});

describe("formatServiceList", () => {
  it("returns a fallback message when there are no services", () => {
    expect(formatServiceList([])).toBe("Пока нет доступных услуг.");
  });

  it("formats name, price, duration and description", () => {
    const result = formatServiceList([
      { id: "1", name: "Small Tattoo", description: "Simple design.", price: 3000, duration_minutes: 60 },
    ]);
    expect(result).toBe("<b>Small Tattoo</b> — 3 000 ₽, 60 мин\nSimple design.");
  });

  it("omits the description line when there isn't one", () => {
    const result = formatServiceList([
      { id: "1", name: "Consultation", description: null, price: 0, duration_minutes: 30 },
    ]);
    expect(result).toBe("<b>Consultation</b> — бесплатно, 30 мин");
  });

  it("joins multiple services with a blank line", () => {
    const result = formatServiceList([
      { id: "1", name: "A", description: null, price: 100, duration_minutes: 30 },
      { id: "2", name: "B", description: null, price: 200, duration_minutes: 60 },
    ]);
    expect(result.split("\n\n")).toHaveLength(2);
  });
});

describe("formatArtistList", () => {
  it("returns a fallback message when there are no artists", () => {
    expect(formatArtistList([])).toBe("Пока нет доступных мастеров.");
  });

  it("formats name, specialization and bio", () => {
    const result = formatArtistList([
      { id: "1", name: "Alex", specialization: "Blackwork", bio: "Bold lines.", image_url: null },
    ]);
    expect(result).toBe("<b>Alex</b> — Blackwork\nBold lines.");
  });

  it("omits specialization and bio when absent", () => {
    const result = formatArtistList([
      { id: "1", name: "Alex", specialization: null, bio: null, image_url: null },
    ]);
    expect(result).toBe("<b>Alex</b>");
  });
});
