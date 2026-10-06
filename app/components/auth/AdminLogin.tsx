"use client";

// Layar login admin — email + password (Supabase Auth).
// Akun dibuat manual oleh pemilik lewat dashboard Supabase (lihat README).

import { useState } from "react";
import { Loader2, Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { BRAND_NAME } from "@/lib/brand";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      setError("Email dan password wajib diisi.");
      return;
    }
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { error: loginError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (loginError) {
      setError("Login gagal. Cek email dan password, lalu coba lagi.");
      setLoading(false);
    }
    // Kalau berhasil, listener di app/page.tsx otomatis menampilkan dashboard.
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-100 dark:bg-zinc-950 px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm p-6 space-y-4"
      >
        <div className="text-center space-y-1">
          <div className="mx-auto w-10 h-10 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 flex items-center justify-center">
            <Lock size={18} />
          </div>
          <h1 className="text-lg font-extrabold tracking-tight text-zinc-900 dark:text-white">
            PO Management
          </h1>
          <p className="text-xs text-zinc-500">{BRAND_NAME}</p>
        </div>

        <div className="space-y-1">
          <label
            htmlFor="email"
            className="text-xs font-semibold text-zinc-600 dark:text-zinc-400"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-zinc-400"
          />
        </div>

        <div className="space-y-1">
          <label
            htmlFor="password"
            className="text-xs font-semibold text-zinc-600 dark:text-zinc-400"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-zinc-400"
          />
        </div>

        {error && (
          <p className="text-xs text-red-600 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-sm font-bold disabled:opacity-60"
        >
          {loading && <Loader2 size={15} className="animate-spin" />}
          Masuk
        </button>
      </form>
    </div>
  );
}
