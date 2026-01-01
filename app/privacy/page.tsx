'use client'

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-black text-gray-50 flex items-center justify-center p-6">
      <div className="max-w-2xl w-full space-y-6">
        <h1 className="text-3xl font-bold">Privacy Policy</h1>
        <p className="text-zinc-400">
          We collect your name, email, and reviews to power Album Club. A full
          privacy policy is coming soon.
        </p>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-6 space-y-3 text-sm text-zinc-400">
          <p>- We use your data to show reviews and send email updates.</p>
          <p>- Only members can see participant names.</p>
          <p>- You can request account deletion at any time.</p>
        </div>
      </div>
    </main>
  )
}
