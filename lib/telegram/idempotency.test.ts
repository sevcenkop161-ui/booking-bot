import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { claimUpdate } from "./idempotency";

function fakeSupabase(insertResult: { error: { code?: string } | null }): SupabaseClient {
  const insert = vi.fn().mockResolvedValue(insertResult);
  const from = vi.fn().mockReturnValue({ insert });
  return { from } as unknown as SupabaseClient;
}

describe("claimUpdate", () => {
  it("returns true when the update_id is new", async () => {
    const supabase = fakeSupabase({ error: null });
    await expect(claimUpdate(supabase, 123)).resolves.toBe(true);
  });

  it("returns false, without throwing, for a duplicate update_id (section 56)", async () => {
    const supabase = fakeSupabase({ error: { code: "23505" } }); // unique_violation
    await expect(claimUpdate(supabase, 123)).resolves.toBe(false);
  });

  it("rethrows database errors that aren't a unique violation", async () => {
    const supabase = fakeSupabase({ error: { code: "57014" } }); // statement timeout, e.g.
    await expect(claimUpdate(supabase, 123)).rejects.toBeTruthy();
  });
});
