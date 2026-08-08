import { DateTime } from "luxon";
import { INPUT_CLASS } from "@/components/ui/form-field";
import { addTimeOffAction, deleteTimeOffAction } from "@/app/dashboard/schedule/actions";
import type { TimeOffEntry } from "@/lib/dashboard/schedule";

export function TimeOffSection({
  artistId,
  entries,
  error,
}: {
  artistId: string;
  entries: TimeOffEntry[];
  error?: string;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <h2 className="mb-3 text-sm font-semibold text-gray-900">Отпуск / нерабочие периоды</h2>

      {entries.length === 0 ? (
        <p className="mb-3 text-sm text-gray-500">Нет запланированных периодов отсутствия.</p>
      ) : (
        <ul className="mb-4 divide-y divide-gray-100 text-sm">
          {entries.map((entry) => (
            <li key={entry.id} className="flex items-center justify-between py-2">
              <span>
                {DateTime.fromISO(entry.start_date).toFormat("d MMM yyyy")} –{" "}
                {DateTime.fromISO(entry.end_date).toFormat("d MMM yyyy")}
                {entry.reason ? ` · ${entry.reason}` : ""}
              </span>
              <form action={deleteTimeOffAction.bind(null, artistId, entry.id)}>
                <button type="submit" className="text-xs text-red-600 hover:underline">
                  Удалить
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}

      {error && <p className="mb-3 text-sm text-red-600">Проверьте даты — что-то введено некорректно.</p>}

      <form action={addTimeOffAction.bind(null, artistId)} className="flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">С</label>
          <input type="date" name="start_date" required className={INPUT_CLASS} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">По</label>
          <input type="date" name="end_date" required className={INPUT_CLASS} />
        </div>
        <div className="flex-1 min-w-[160px]">
          <label className="mb-1 block text-xs font-medium text-gray-700">Причина (необязательно)</label>
          <input type="text" name="reason" className={INPUT_CLASS} />
        </div>
        <button
          type="submit"
          className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
        >
          Добавить
        </button>
      </form>
    </div>
  );
}
