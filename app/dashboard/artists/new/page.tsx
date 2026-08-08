import { createClient } from "@/lib/supabase/server";
import { getPrimaryBusiness } from "@/lib/business";
import { getServices } from "@/lib/dashboard/services";
import { ArtistForm } from "@/components/dashboard/artist-form";
import { createArtistAction } from "../actions";

export default async function NewArtistPage() {
  const supabase = await createClient();
  const business = await getPrimaryBusiness(supabase);
  const allServices = business ? await getServices(supabase, business.id) : [];

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold text-gray-900">Новый мастер</h1>
      <ArtistForm
        action={createArtistAction}
        initialValues={{
          name: "",
          specialization: "",
          bio: "",
          image_url: "",
          active: true,
          service_ids: [],
        }}
        submitLabel="Создать"
        allServices={allServices}
      />
    </div>
  );
}
