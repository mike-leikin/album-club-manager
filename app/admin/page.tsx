// app/admin/page.tsx

export default function AdminPage() {
  return (
    <main className="min-h-screen p-6">
      <h1 className="text-2xl font-bold mb-4">Admin / Curator</h1>
      <p className="mb-2">
        This is where you’ll manage weekly albums, survey links, and see ratings.
      </p>
      <p>
        For now, this is just a placeholder. Next step will be a simple form to
        enter the contemporary + classic albums for a week (no database yet).
      </p>
    </main>
  );
}