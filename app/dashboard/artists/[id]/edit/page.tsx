import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPrimaryBusiness } from "@/lib/business";
import { getArtistById, getArtistServiceIds } from "@/lib/dashboard/artists";
import { getServices } from "@/lib/dashboard/services";
import { ArtistForm } from "@/components/dashboard/artist-form";
import { updateArtistAction } from "../../actions";

export default async function EditArtistPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const business = await getPrimaryBusiness(supabase);
  if (!business) notFound();

  const artist = await getArtistById(supabase, business.id, id);
  if (!artist) notFound();

  const [serviceIds, allServices] = await Promise.all([
    getArtistServiceIds(supabase, id),
    getServices(supabase, business.id),
  ]);

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold text-gray-900">Редактировать мастера</h1>
      <ArtistForm
        action={updateArtistAction.bind(null, id)}
        initialValues={{
          name: artist.name,
          specialization: artist.specialization ?? "",
          bio: artist.bio ?? "",
          image_url: artist.image_url ?? "",
          active: artist.active,
          service_ids: serviceIds,
        }}
        submitLabel="Сохранить"
        allServices={allServices}
      />
    </div>
  );
}
