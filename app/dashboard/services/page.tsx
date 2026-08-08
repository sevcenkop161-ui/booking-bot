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
  if (!business) return <p className="text-gray-500">Бизнес не найден.</p>;

  const services = await getServices(supabase, business.id);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900">Услуги</h1>
        <Link
          href="/dashboard/services/new"
          className="rounded-md bg-gray-900 px-3 py-1.5 text-sm text-white hover:bg-gray-700"
        >
          + Добавить услугу
        </Link>
      </div>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error === "cannot_delete"
            ? "Нельзя удалить — на эту услугу уже есть записи. Отключите её вместо удаления."
            : "Не удалось выполнить действие."}
        </p>
      )}

      {services.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-gray-500">
          Услуг пока нет.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Название</th>
                <th className="px-4 py-3">Цена</th>
                <th className="px-4 py-3">Длительность</th>
                <th className="px-4 py-3">Статус</th>
                <th className="px-4 py-3">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {services.map((service) => (
                <tr key={service.id}>
                  <td className="px-4 py-3 font-medium text-gray-900">{service.name}</td>
                  <td className="px-4 py-3 text-gray-700">
                    {service.price > 0 ? `${service.price} ₽` : "бесплатно"}
                  </td>
                  <td className="px-4 py-3 text-gray-700">{service.duration_minutes} мин</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        service.active ? "bg-green-100 text-green-800" : "bg-gray-200 text-gray-600"
                      }`}
                    >
                      {service.active ? "Активна" : "Отключена"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/dashboard/services/${service.id}/edit`}
                        className="rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-100"
                      >
                        Редактировать
                      </Link>
                      <form action={setServiceActiveAction.bind(null, service.id, !service.active)}>
                        <button
                          type="submit"
                          className="rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-100"
                        >
                          {service.active ? "Отключить" : "Включить"}
                        </button>
                      </form>
                      <form action={deleteServiceAction.bind(null, service.id)}>
                        <button
                          type="submit"
                          className="rounded-md border border-red-300 px-2 py-1 text-xs text-red-700 hover:bg-red-50"
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
