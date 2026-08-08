import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getPrimaryBusiness } from "@/lib/business";
import { getArtists } from "@/lib/dashboard/artists";
import { getArtistWeekSchedule, getArtistTimeOff } from "@/lib/dashboard/schedule";
import { ScheduleWeekForm } from "@/components/dashboard/schedule-week-form";
import { TimeOffSection } from "@/components/dashboard/time-off-section";
import { saveScheduleAction } from "./actions";

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ artist?: string; error?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const business = await getPrimaryBusiness(supabase);
  if (!business) return <p className="text-foreground-secondary">Бизнес не найден.</p>;

  const artists = await getArtists(supabase, business.id);
  if (artists.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-8 text-center text-foreground-secondary">
        Сначала добавьте мастера на странице «Artists».
      </div>
    );
  }

  const activeArtistId = artists.some((a) => a.id === params.artist) ? params.artist! : artists[0].id;

  const [weekSchedule, timeOff] = await Promise.all([
    getArtistWeekSchedule(supabase, activeArtistId),
    getArtistTimeOff(supabase, activeArtistId),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold text-foreground">Расписание</h1>

      <div className="flex flex-wrap gap-2">
        {artists.map((artist) => (
          <Link
            key={artist.id}
            href={`/dashboard/schedule?artist=${artist.id}`}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              artist.id === activeArtistId
                ? "bg-accent-solid text-white"
                : "bg-background-secondary text-foreground hover:bg-border"
            }`}
          >
            {artist.name}
          </Link>
        ))}
      </div>

      <ScheduleWeekForm
        artistId={activeArtistId}
        action={saveScheduleAction.bind(null, activeArtistId)}
        initialValues={weekSchedule}
      />

      <TimeOffSection artistId={activeArtistId} entries={timeOff} error={params.error} />
    </div>
  );
}
