import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "./logout-button";

// Grows as each section is built — no point linking to pages that don't
// exist yet.
const NAV_ITEMS = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/bookings", label: "Bookings" },
  { href: "/dashboard/calendar", label: "Calendar" },
  { href: "/dashboard/services", label: "Services" },
  { href: "/dashboard/artists", label: "Artists" },
  { href: "/dashboard/schedule", label: "Schedule" },
];

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
      <header className="border-b border-gray-200 bg-white px-4 py-3 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
            <span className="text-sm font-medium text-gray-900">{businessName}</span>
            <nav className="flex gap-4 overflow-x-auto">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="whitespace-nowrap text-sm text-gray-600 hover:text-gray-900"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <span className="hidden sm:inline">
              {user.email} · {admin.role}
            </span>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="p-4 sm:p-6">{children}</main>
    </div>
  );
}
