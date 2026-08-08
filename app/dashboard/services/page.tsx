import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getPrimaryBusiness } from "@/lib/business";
import { getServices } from "@/lib/dashboard/services";
import { deleteServiceAction, setServiceActiveAction } from "./actions";

export default async function ServicesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const business = await getPrimaryBusiness(supabase);
  if (!business) return <p className="text-foreground-secondary">Бизнес не найден.</p>;

  const services = await getServices(supabase, business.id);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-foreground">Услуги</h1>
        <Link
          href="/dashboard/services/new"
          className="rounded-md bg-accent-solid px-3 py-1.5 text-sm text-white hover:bg-accent-solid-hover"
        >
          + Добавить услугу
        </Link>
      </div>

      {error && (
        <p className="rounded-md bg-status-cancelled-bg px-3 py-2 text-sm text-status-cancelled-text">
          {error === "cannot_delete"
            ? "Нельзя удалить — на эту услугу уже есть записи. Отключите её вместо удаления."
            : "Не удалось выполнить действие."}
        </p>
      )}

      {services.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center text-foreground-secondary">
          Услуг пока нет.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-background-secondary text-left text-xs font-medium uppercase tracking-wide text-foreground-secondary">
              <tr>
                <th className="px-4 py-3">Название</th>
                <th className="px-4 py-3">Цена</th>
                <th className="px-4 py-3">Длительность</th>
                <th className="px-4 py-3">Статус</th>
                <th className="px-4 py-3">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {services.map((service) => (
                <tr key={service.id}>
                  <td className="px-4 py-3 font-medium text-foreground">{service.name}</td>
                  <td className="px-4 py-3 text-foreground">
                    {service.price > 0 ? `${service.price} ₽` : "бесплатно"}
                  </td>
                  <td className="px-4 py-3 text-foreground">{service.duration_minutes} мин</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        service.active ? "bg-status-confirmed-bg text-status-confirmed-text" : "bg-background-secondary text-foreground-secondary"
                      }`}
                    >
                      {service.active ? "Активна" : "Отключена"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/dashboard/services/${service.id}/edit`}
                        className="rounded-md border border-border px-2 py-1 text-xs text-foreground hover:bg-background-secondary"
                      >
                        Редактировать
                      </Link>
                      <form action={setServiceActiveAction.bind(null, service.id, !service.active)}>
                        <button
                          type="submit"
                          className="rounded-md border border-border px-2 py-1 text-xs text-foreground hover:bg-background-secondary"
                        >
                          {service.active ? "Отключить" : "Включить"}
                        </button>
                      </form>
                      <form action={deleteServiceAction.bind(null, service.id)}>
                        <button
                          type="submit"
                          className="rounded-md border border-status-cancelled-text px-2 py-1 text-xs text-status-cancelled-text hover:bg-status-cancelled-bg"
                        >
                          Удалить
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
