// app/page.tsx
export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4">
      <h1 className="text-4xl font-bold mb-4">Album Club Manager</h1>
      <p className="mb-8 text-lg text-gray-600">
        A weekly club for one new release and one classic.
      </p>

      <section className="w-full max-w-xl space-y-4">
        <h2 className="text-2xl font-semibold">This Week&apos;s Albums</h2>
        <div className="border rounded-lg p-4">
          <h3 className="font-semibold mb-2">Contemporary Album</h3>
          <p>Coming soon…</p>
        </div>
        <div className="border rounded-lg p-4">
          <h3 className="font-semibold mb-2">Classic Album</h3>
          <p>Coming soon…</p>
        </div>
      </section>
    </main>
  );
}
