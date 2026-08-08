"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      setLoading(false);
      setError("Неверный email или пароль.");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-background px-4">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-xl border border-border bg-card p-8 shadow-sm"
      >
        <h1 className="mb-1 font-display text-2xl font-semibold text-foreground">Booking Bot Admin</h1>
        <p className="mb-6 text-sm text-foreground-secondary">Войдите, чтобы открыть панель управления.</p>

        <label className="mb-1 block text-sm font-medium text-foreground" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mb-4 w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
        />

        <label className="mb-1 block text-sm font-medium text-foreground" htmlFor="password">
          Пароль
        </label>
        <input
          id="password"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-4 w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
        />

        {error && <p className="mb-4 text-sm text-status-cancelled-text">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-accent-solid px-3 py-2 text-sm font-medium text-white hover:bg-accent-solid-hover disabled:opacity-50"
        >
          {loading ? "Входим…" : "Войти"}
        </button>
      </form>
    </main>
  );
}
