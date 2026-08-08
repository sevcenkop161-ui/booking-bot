"use client";

import { useActionState } from "react";
import { FormField, INPUT_CLASS } from "@/components/ui/form-field";
import type { ArtistFormState, ArtistFormValues } from "@/app/dashboard/artists/actions";

export function ArtistForm({
  action,
  initialValues,
  submitLabel,
  allServices,
}: {
  action: (state: ArtistFormState, formData: FormData) => Promise<ArtistFormState>;
  initialValues: ArtistFormValues;
  submitLabel: string;
  allServices: { id: string; name: string }[];
}) {
  const [state, formAction, pending] = useActionState(action, { values: initialValues });

  return (
    <form action={formAction} className="max-w-lg rounded-lg border border-gray-200 bg-white p-6">
      <FormField label="Имя" name="name">
        <input id="name" name="name" required defaultValue={state.values.name} className={INPUT_CLASS} />
      </FormField>

      <FormField label="Специализация" name="specialization">
        <input
          id="specialization"
          name="specialization"
          defaultValue={state.values.specialization}
          className={INPUT_CLASS}
        />
      </FormField>

      <FormField label="О мастере" name="bio">
        <textarea id="bio" name="bio" rows={3} defaultValue={state.values.bio} className={INPUT_CLASS} />
      </FormField>

      <FormField label="Ссылка на фото (необязательно)" name="image_url">
        <input
          id="image_url"
          name="image_url"
          defaultValue={state.values.image_url}
          placeholder="https://…"
          className={INPUT_CLASS}
        />
      </FormField>

      <FormField label="Услуги" name="service_ids">
        {allServices.length === 0 ? (
          <p className="text-sm text-gray-500">Сначала добавьте хотя бы одну услугу.</p>
        ) : (
          <div className="space-y-1">
            {allServices.map((service) => (
              <label key={service.id} className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  name="service_ids"
                  value={service.id}
                  defaultChecked={state.values.service_ids.includes(service.id)}
                />
                {service.name}
              </label>
            ))}
          </div>
        )}
      </FormField>

      <label className="mb-4 mt-2 flex items-center gap-2 text-sm text-gray-700">
        <input type="checkbox" name="active" defaultChecked={state.values.active} />
        Активен (доступен для записи)
      </label>

      {state.error && <p className="mb-4 text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
      >
        {pending ? "Сохраняем…" : submitLabel}
      </button>
    </form>
  );
}
