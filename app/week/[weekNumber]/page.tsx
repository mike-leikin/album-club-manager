// app/week/[weekNumber]/page.tsx

type WeekPageProps = {
  params: { weekNumber: string };
};

const exampleWeek = {
  weekNumber: 1,
  contemporary: {
    title: "Contemporary Example Album",
    artist: "New Artist",
    year: 2024,
    spotifyUrl: "https://open.spotify.com/",
  },
  classic: {
    title: "Classic Example Album",
    artist: "Legendary Artist",
    rsRank: 42,
    spotifyUrl: "https://open.spotify.com/",
  },
  responseDeadline: "Friday, 11:59 PM",
};

export default function WeekPage({ params }: WeekPageProps) {
  const { weekNumber } = params;

  // Eventually we'll fetch real data by weekNumber. For now, just show exampleWeek.
  const week = exampleWeek;

  return (
    <main className="min-h-screen p-6">
      <h1 className="text-2xl font-bold mb-4">
        Album Club – Week {weekNumber}
      </h1>

      <p className="mb-4">
        Ratings: 1.0 – 10.0 (Pitchfork-style). Response deadline:{" "}
        {week.responseDeadline}.
      </p>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="border rounded p-4">
          <h2 className="font-semibold mb-2">Contemporary Pick</h2>
          <p className="text-lg font-bold">
            {week.contemporary.title} – {week.contemporary.artist}
          </p>
          <p className="text-sm text-gray-600">Released {week.contemporary.year}</p>
          <a
            href={week.contemporary.spotifyUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-block mt-3 underline"
          >
            Listen on Spotify
          </a>
        </div>

        <div className="border rounded p-4">
          <h2 className="font-semibold mb-2">Classic Pick</h2>
          <p className="text-lg font-bold">
            {week.classic.title} – {week.classic.artist}
          </p>
          <p className="text-sm text-gray-600">
            Rolling Stone 500 Rank: #{week.classic.rsRank}
          </p>
          <a
            href={week.classic.spotifyUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-block mt-3 underline"
          >
            Listen on Spotify
          </a>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="font-semibold mb-2">Survey Links (placeholder)</h2>
        <ul className="list-disc list-inside">
          <li>Contemporary album survey: (coming soon)</li>
          <li>Classic album survey: (coming soon)</li>
        </ul>
      </section>
    </main>
  );
}