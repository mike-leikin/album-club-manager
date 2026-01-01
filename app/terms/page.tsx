'use client'

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-black text-gray-50 flex items-center justify-center p-6">
      <div className="max-w-2xl w-full space-y-6">
        <h1 className="text-3xl font-bold">Terms of Service</h1>
        <p className="text-zinc-400">
          These terms outline your responsibilities when participating in Album
          Club. We&apos;ll add the full legal text soon.
        </p>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-6 space-y-3 text-sm text-zinc-400">
          <p>- Be respectful in reviews and discussions.</p>
          <p>- You own your content but grant us permission to display it.</p>
          <p>- Accounts that violate community guidelines may be removed.</p>
        </div>
      </div>
    </main>
  )
}
