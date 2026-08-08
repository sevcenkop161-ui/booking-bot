"use client";

import { useActionState } from "react";
import { FormField, INPUT_CLASS } from "@/components/ui/form-field";
import type { ServiceFormState, ServiceFormValues } from "@/app/dashboard/services/actions";

export function ServiceForm({
  action,
  initialValues,
  submitLabel,
}: {
  action: (state: ServiceFormState, formData: FormData) => Promise<ServiceFormState>;
  initialValues: ServiceFormValues;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, { values: initialValues });

  return (
    <form action={formAction} className="max-w-lg rounded-lg border border-border bg-card p-6">
      <FormField label="Название" name="name">
        <input id="name" name="name" required defaultValue={state.values.name} className={INPUT_CLASS} />
      </FormField>

      <FormField label="Описание" name="description">
        <textarea
          id="description"
          name="description"
          rows={3}
          defaultValue={state.values.description}
          className={INPUT_CLASS}
        />
      </FormField>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Цена (₽)" name="price">
          <input
            id="price"
            name="price"
            type="number"
            min={0}
            step="1"
            defaultValue={state.values.price}
            className={INPUT_CLASS}
          />
        </FormField>
        <FormField label="Длительность (мин)" name="duration_minutes">
          <input
            id="duration_minutes"
            name="duration_minutes"
            type="number"
            min={5}
            step="5"
            defaultValue={state.values.duration_minutes}
            className={INPUT_CLASS}
          />
        </FormField>
      </div>

      <label className="mb-4 flex items-center gap-2 text-sm text-foreground">
        <input type="checkbox" name="active" defaultChecked={state.values.active} />
        Активна (показывается клиентам)
      </label>

      {state.error && <p className="mb-4 text-sm text-status-cancelled-text">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-accent-solid px-4 py-2 text-sm font-medium text-white hover:bg-accent-solid-hover disabled:opacity-50"
      >
        {pending ? "Сохраняем…" : submitLabel}
      </button>
    </form>
  );
}
