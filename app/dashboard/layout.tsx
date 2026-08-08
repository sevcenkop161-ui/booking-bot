import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "./logout-button";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Authenticated is not the same as authorized (section 34) — being a
  // valid Supabase Auth user only gets you this far. Access to the
  // dashboard itself requires a matching row in admins.
  const { data: admin } = await supabase
    .from("admins")
    .select("role, businesses(name)")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!admin) redirect("/login");

  const businessName = (admin.businesses as unknown as { name: string } | null)?.name ?? "—";

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
        <div className="text-sm font-medium text-gray-900">{businessName}</div>
        <div className="flex items-center gap-3 text-sm text-gray-600">
          <span>
            {user.email} · {admin.role}
          </span>
          <LogoutButton />
        </div>
      </header>
      <main className="p-6">{children}</main>
    </div>
  );
}
