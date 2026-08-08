import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPrimaryBusiness } from "@/lib/business";
import { getServiceById } from "@/lib/dashboard/services";
import { ServiceForm } from "@/components/dashboard/service-form";
import { updateServiceAction } from "../../actions";

export default async function EditServicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const business = await getPrimaryBusiness(supabase);
  if (!business) notFound();

  const service = await getServiceById(supabase, business.id, id);
  if (!service) notFound();

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold text-gray-900">Редактировать услугу</h1>
      <ServiceForm
        action={updateServiceAction.bind(null, id)}
        initialValues={{
          name: service.name,
          description: service.description ?? "",
          price: String(service.price),
          duration_minutes: String(service.duration_minutes),
          active: service.active,
        }}
        submitLabel="Сохранить"
      />
    </div>
  );
}
