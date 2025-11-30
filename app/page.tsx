// app/page.tsx
export default function HomePage() {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="max-w-xl text-center space-y-4">
        <h1 className="text-3xl font-bold">Album Club Manager</h1>
        <p className="text-gray-600">
          A helper app for selecting albums, generating emails, and reviewing ratings.
        </p>
        <a
          href="/admin"
          className="inline-block rounded-md border px-4 py-2 text-sm font-medium hover:bg-gray-50"
        >
          Go to Curator Dashboard
        </a>
      </div>
    </main>
  );
}
