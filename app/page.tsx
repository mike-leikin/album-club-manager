// app/page.tsx
import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 p-6">
      <h1 className="text-3xl font-bold">Album Club Manager</h1>
      <p className="text-center max-w-xl">
        A weekly music album club with one contemporary release and one
        classic from the Rolling Stone 500. This is the future control center.
      </p>

      <div className="flex gap-4">
        <Link
          href="/week/1"
          className="rounded border px-4 py-2 hover:bg-black hover:text-white"
        >
          View Week 1 (example)
        </Link>
        <Link
          href="/admin"
          className="rounded border px-4 py-2 hover:bg-black hover:text-white"
        >
          Admin / Curator
        </Link>
      </div>
    </main>
  );
}