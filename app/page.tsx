"use client";

// app/page.tsx — Halaman admin PO Management.
//
// Alur:
//   1. Belum login            → tampilkan AdminLogin
//   2. Login, tapi bukan admin → pesan "belum terdaftar" (+ tombol keluar)
//   3. Admin                   → daftar PO (/) atau detail satu PO (/?poId=...)
//
// "Admin" = user yang id-nya terdaftar di tabel `po_admins` (lihat supabase/schema.sql).
// Pengecekan di sini hanya untuk tampilan; yang MENGAMANKAN data adalah RLS di database.

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, LogOut } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { BRAND_NAME } from "@/lib/brand";
import AdminLogin from "@/app/components/auth/AdminLogin";
import POListSelector from "@/app/components/po/POListSelector";
import POManagementView from "@/app/components/po/POManagementView";

type AuthState =
  | { status: "loading" }
  | { status: "anon" }
  | { status: "forbidden"; user: User }
  | { status: "admin"; user: User };

function AdminApp() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const searchParams = useSearchParams();
  const poId = searchParams.get("poId");

  const [auth, setAuth] = useState<AuthState>({ status: "loading" });

  useEffect(() => {
    let active = true;

    async function resolve(user: User | null) {
      if (!user) {
        if (active) setAuth({ status: "anon" });
        return;
      }
      const { data } = await supabase
        .from("po_admins")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();
      if (!active) return;
      setAuth(data ? { status: "admin", user } : { status: "forbidden", user });
    }

    supabase.auth.getSession().then(({ data }) => resolve(data.session?.user ?? null));

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      // Jangan panggil query Supabase langsung di dalam callback ini (bisa deadlock) → tunda.
      setTimeout(() => resolve(session?.user ?? null), 0);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/");
  }

  if (auth.status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-zinc-400" />
      </div>
    );
  }

  if (auth.status === "anon") return <AdminLogin />;

  if (auth.status === "forbidden") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-zinc-100 dark:bg-zinc-950">
        <div className="max-w-sm w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 text-center space-y-3">
          <h1 className="text-base font-extrabold text-zinc-900 dark:text-white">
            Akun belum terdaftar sebagai admin
          </h1>
          <p className="text-sm text-zinc-500">
            {auth.user.email} berhasil login, tetapi belum didaftarkan di tabel{" "}
            <code className="font-mono text-xs">po_admins</code>. Minta pemilik aplikasi
            menambahkannya (lihat README bagian &quot;Membuat akun admin&quot;).
          </p>
          <button
            onClick={handleLogout}
            className="px-4 py-2 rounded-lg bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-sm font-bold"
          >
            Keluar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-zinc-900/90 backdrop-blur border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-14 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-extrabold tracking-tight text-zinc-900 dark:text-white truncate">
              PO Management
            </p>
            <p className="text-[11px] text-zinc-500 truncate">{BRAND_NAME}</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="hidden sm:block text-xs text-zinc-500 truncate max-w-[200px]">
              {auth.user.email}
            </span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <LogOut size={14} />
              Keluar
            </button>
          </div>
        </div>
      </header>

      <main className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full">
        {poId ? (
          <POManagementView poId={poId} onBack={() => router.push("/")} />
        ) : (
          <POListSelector onSelect={(id) => router.push(`/?poId=${id}`)} />
        )}
      </main>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="animate-spin text-zinc-400" />
        </div>
      }
    >
      <AdminApp />
    </Suspense>
  );
}
