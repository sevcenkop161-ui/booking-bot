import { describe, expect, it } from "vitest";
import { nameSchema, phoneSchema } from "./contact";

describe("nameSchema", () => {
  it("accepts a normal name", () => {
    expect(nameSchema.safeParse("Анна").success).toBe(true);
  });

  it("trims whitespace", () => {
    const result = nameSchema.safeParse("  Анна  ");
    expect(result.success && result.data).toBe("Анна");
  });

  it("rejects a single character", () => {
    expect(nameSchema.safeParse("A").success).toBe(false);
  });
});

describe("phoneSchema", () => {
  it("accepts a formatted Russian phone number and strips punctuation", () => {
    const result = phoneSchema.safeParse("+7 999 123 45 67");
    expect(result.success && result.data).toBe("+79991234567");
  });

  it("accepts a number with dashes and parentheses", () => {
    const result = phoneSchema.safeParse("8(999)123-45-67");
    expect(result.success && result.data).toBe("89991234567");
  });

  it("rejects text that isn't a phone number", () => {
    expect(phoneSchema.safeParse("не хочу говорить").success).toBe(false);
  });

  it("rejects a number that's too short", () => {
    expect(phoneSchema.safeParse("12345").success).toBe(false);
  });
});
