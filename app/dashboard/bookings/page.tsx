import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getPrimaryBusiness } from "@/lib/business";
import { getBookingsPage, BOOKING_STATUSES, type BookingStatus } from "@/lib/dashboard/bookings";
import { BookingsTable } from "@/components/dashboard/bookings-table";

const PAGE_SIZE = 20;

function isBookingStatus(value: string | undefined): value is BookingStatus {
  return !!value && (BOOKING_STATUSES as readonly string[]).includes(value);
}

function pageHref(status: string | undefined, page: number): string {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/dashboard/bookings?${query}` : "/dashboard/bookings";
}

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const params = await searchParams;
  const status = isBookingStatus(params.status) ? params.status : undefined;
  const page = Math.max(1, Number(params.page) || 1);

  const supabase = await createClient();
  const business = await getPrimaryBusiness(supabase);
  if (!business) {
    return <p className="text-foreground-secondary">Бизнес не найден.</p>;
  }

  const { bookings, total } = await getBookingsPage(supabase, {
    businessId: business.id,
    page,
    pageSize: PAGE_SIZE,
    status,
  });
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-foreground">Записи</h1>
        <span className="text-sm text-foreground-secondary">{total} всего</span>
      </div>

      <div className="flex flex-wrap gap-2">
        <FilterLink label="Все" active={!status} href={pageHref(undefined, 1)} />
        {BOOKING_STATUSES.map((s) => (
          <FilterLink key={s} label={s} active={status === s} href={pageHref(s, 1)} />
        ))}
      </div>

      <BookingsTable bookings={bookings} timezone={business.timezone} />

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-foreground-secondary">
          <span>
            Страница {page} из {totalPages}
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link className="rounded-md border border-border px-3 py-1 hover:bg-background-secondary" href={pageHref(status, page - 1)}>
                Назад
              </Link>
            )}
            {page < totalPages && (
              <Link className="rounded-md border border-border px-3 py-1 hover:bg-background-secondary" href={pageHref(status, page + 1)}>
                Вперёд
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function FilterLink({ label, active, href }: { label: string; active: boolean; href: string }) {
  return (
    <Link
      href={href}
      className={`rounded-full px-3 py-1 text-xs font-medium ${
        active ? "bg-accent-solid text-white" : "bg-background-secondary text-foreground hover:bg-border"
      }`}
    >
      {label}
    </Link>
  );
}
