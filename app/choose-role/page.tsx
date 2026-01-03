"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createAuthClient } from "@/lib/auth/supabaseAuthClientBrowser";

export default function ChooseRolePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [userName, setUserName] = useState("");
  const supabase = createAuthClient();

  useEffect(() => {
    // Check authentication and get user info
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        router.push("/login");
        return;
      }

      // Fetch participant info to get name
      const { data: participant } = (await supabase
        .from("participants")
        .select("name, is_curator")
        .eq("auth_user_id", session.user.id)
        .single()) as { data: { name: string; is_curator: boolean } | null };

      if (!participant) {
        router.push("/login");
        return;
      }

      // If not a curator, redirect straight to dashboard
      if (!participant.is_curator) {
        router.push("/dashboard");
        return;
      }

      setUserName(participant.name);
      setIsLoading(false);
    });
  }, [router, supabase]);

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-gray-50">
        <div className="text-zinc-400">Loading...</div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-black p-4 text-gray-50">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="mb-2 text-3xl font-bold text-white">
            Welcome back, {userName}!
          </h1>
          <p className="text-zinc-400">
            What would you like to do today?
          </p>
        </div>

        <div className="space-y-4">
          {/* Admin Panel Option */}
          <button
            onClick={() => router.push("/admin")}
            className="group w-full rounded-2xl border border-zinc-800 bg-zinc-950/80 p-6 text-left transition hover:border-emerald-500 hover:bg-zinc-900"
          >
            <div className="mb-2 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-500/20 text-2xl">
                ⚙️
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white group-hover:text-emerald-400">
                  Curator Dashboard
                </h2>
                <p className="text-sm text-zinc-400">
                  Manage albums, participants, and reviews
                </p>
              </div>
            </div>
            <ul className="ml-15 space-y-1 text-sm text-zinc-500">
              <li>• Set up weekly albums</li>
              <li>• Send emails to participants</li>
              <li>• Moderate reviews</li>
              <li>• Manage participants</li>
            </ul>
          </button>

          {/* Personal Dashboard Option */}
          <button
            onClick={() => router.push("/dashboard")}
            className="group w-full rounded-2xl border border-zinc-800 bg-zinc-950/80 p-6 text-left transition hover:border-blue-500 hover:bg-zinc-900"
          >
            <div className="mb-2 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500/20 text-2xl">
                🎵
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white group-hover:text-blue-400">
                  My Reviews
                </h2>
                <p className="text-sm text-zinc-400">
                  View and manage your personal reviews
                </p>
              </div>
            </div>
            <ul className="ml-15 space-y-1 text-sm text-zinc-500">
              <li>• Submit your weekly reviews</li>
              <li>• View your review history</li>
              <li>• See your participation stats</li>
              <li>• Edit past reviews</li>
            </ul>
          </button>
        </div>

        <div className="text-center">
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              router.push("/");
            }}
            className="text-sm text-zinc-500 hover:text-zinc-300 underline"
          >
            Sign out
          </button>
        </div>
      </div>
    </main>
  );
}
