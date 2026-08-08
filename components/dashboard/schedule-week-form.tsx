"use client";

import { useActionState } from "react";
import { INPUT_CLASS } from "@/components/ui/form-field";
import type { RawDaySchedule, ScheduleFormState } from "@/app/dashboard/schedule/actions";

const DAY_LABELS: Record<number, string> = {
  1: "Понедельник",
  2: "Вторник",
  3: "Среда",
  4: "Четверг",
  5: "Пятница",
  6: "Суббота",
  0: "Воскресенье",
};

// Monday-first display order, even though day_of_week itself follows
// Postgres's 0=Sunday convention.
const DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

const timeInputClass = `${INPUT_CLASS} w-28`;

export function ScheduleWeekForm({
  artistId,
  action,
  initialValues,
}: {
  artistId: string;
  action: (state: ScheduleFormState, formData: FormData) => Promise<ScheduleFormState>;
  initialValues: RawDaySchedule[];
}) {
  const [state, formAction, pending] = useActionState(action, { values: initialValues });

  return (
    <form key={artistId} action={formAction} className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="text-left text-xs font-medium uppercase tracking-wide text-gray-500">
            <tr>
              <th className="py-2 pr-4">День</th>
              <th className="py-2 pr-4">Рабочий</th>
              <th className="py-2 pr-4">Начало</th>
              <th className="py-2 pr-4">Конец</th>
              <th className="py-2 pr-4">Перерыв с</th>
              <th className="py-2 pr-4">до</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {DISPLAY_ORDER.map((dayOfWeek) => {
              const day = state.values.find((d) => d.dayOfWeek === dayOfWeek)!;
              return (
                <tr key={dayOfWeek}>
                  <td className="py-2 pr-4 font-medium text-gray-900">{DAY_LABELS[dayOfWeek]}</td>
                  <td className="py-2 pr-4">
                    <input
                      type="checkbox"
                      name={`is_working_${dayOfWeek}`}
                      defaultChecked={day.isWorking}
                    />
                  </td>
                  <td className="py-2 pr-4">
                    <input
                      type="time"
                      name={`start_time_${dayOfWeek}`}
                      defaultValue={day.startTime}
                      className={timeInputClass}
                    />
                  </td>
                  <td className="py-2 pr-4">
                    <input
                      type="time"
                      name={`end_time_${dayOfWeek}`}
                      defaultValue={day.endTime}
                      className={timeInputClass}
                    />
                  </td>
                  <td className="py-2 pr-4">
                    <input
                      type="time"
                      name={`break_start_${dayOfWeek}`}
                      defaultValue={day.breakStart ?? ""}
                      className={timeInputClass}
                    />
                  </td>
                  <td className="py-2 pr-4">
                    <input
                      type="time"
                      name={`break_end_${dayOfWeek}`}
                      defaultValue={day.breakEnd ?? ""}
                      className={timeInputClass}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {state.error && <p className="mt-3 text-sm text-red-600">{state.error}</p>}
      {state.success && !state.error && <p className="mt-3 text-sm text-green-600">Сохранено ✓</p>}

      <button
        type="submit"
        disabled={pending}
        className="mt-4 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
      >
        {pending ? "Сохраняем…" : "Сохранить расписание"}
      </button>
    </form>
  );
}
