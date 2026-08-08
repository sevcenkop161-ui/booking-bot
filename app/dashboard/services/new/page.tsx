import { ServiceForm } from "@/components/dashboard/service-form";
import { createServiceAction } from "../actions";

export default function NewServicePage() {
  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold text-gray-900">Новая услуга</h1>
      <ServiceForm
        action={createServiceAction}
        initialValues={{ name: "", description: "", price: "", duration_minutes: "60", active: true }}
        submitLabel="Создать"
      />
    </div>
  );
}
