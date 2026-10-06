"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { loginReseller } from "@/lib/po/supabase";

function ResellerLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const slug = searchParams.get("slug");

  const katalogHref = slug ? `/po/${slug}` : "/po";

  const [kode, setKode] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!kode || !pin) {
      setError("Kode dan PIN wajib diisi.");
      return;
    }
    setLoading(true);
    setError("");

    const result = await loginReseller(kode.trim().toUpperCase(), pin.trim());

    if (!result.sukses) {
      setError(result.pesan || "Login gagal.");
      setLoading(false);
      return;
    }

    sessionStorage.setItem("po_reseller", JSON.stringify(result.reseller));
    if (slug) {
      sessionStorage.setItem("po_slug", slug);
    }
    router.push(
      slug ? `/po/reseller/portal?slug=${slug}` : "/po/reseller/portal",
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f4] text-[#0e0e0e] font-sans flex flex-col">
      <header className="bg-white border-b border-[#e5e7eb] px-4 md:px-12 h-[58px] flex items-center justify-between sticky top-0 z-50">
        <div className="text-[15px] font-extrabold tracking-tight flex items-center gap-2">
          Portal Reseller
        </div>
      </header>

      <div className="bg-[#0e0e0e] text-white px-4 py-8 md:py-11 md:px-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_50%,#1f2937_0%,transparent_55%)] pointer-events-none"></div>
        <div className="relative z-10 max-w-[600px] mx-auto md:mx-0">
          <div className="inline-flex items-center gap-[7px] text-[11px] font-bold tracking-widest uppercase text-white/50 mb-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#4ade80]"></div>
            Akses Khusus Reseller
          </div>
          <h1 className="text-[21px] md:text-[28px] font-extrabold tracking-tight leading-tight mb-15">
            Selamat datang,{" "}
            <em className="not-italic text-white/40">Reseller</em>
          </h1>
          <p className="text-[13.6px] text-white/55">
            Masuk dengan Username dan PIN/sandi reseller Anda untuk mulai input
            pesanan.
          </p>
        </div>
      </div>

      <div className="max-w-[420px] w-full mx-auto mt-9 px-4 pb-20 flex-1">
        <div className="bg-white border border-[#e5e7eb] rounded-xl overflow-hidden">
          <div className="p-4 md:p-5">
            <div className="text-[11px] font-bold tracking-widest uppercase text-[#9ca3af] mb-3.5 flex items-center gap-1.5">
              Login Reseller
            </div>

            {error && (
              <div className="flex items-start gap-2 bg-[#fef2f2] text-[#b91c1c] border border-[#fecaca] p-3 rounded-lg text-[13px] font-semibold mb-3.5">
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-3.5">
              <div>
                <label className="block text-[12.5px] font-bold text-[#0e0e0e] mb-1.5">
                  Username
                </label>
                <input
                  type="text"
                  value={kode}
                  onChange={(e) => setKode(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === "Enter" &&
                    document.getElementById("pin-input")?.focus()
                  }
                  placeholder="Username Anda"
                  className="w-full px-3 py-2.5 border border-[#e5e7eb] rounded-lg text-[14px] text-[#0e0e0e] outline-none focus:border-[#0e0e0e] focus:shadow-[0_0_0_3px_rgba(14,14,14,0.07)] transition-all bg-white uppercase"
                />
              </div>
              <div>
                <label className="block text-[12.5px] font-bold text-[#0e0e0e] mb-1.5">
                  PIN/Sandi
                </label>
                <input
                  id="pin-input"
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                  placeholder="Masukkan PIN/Sandi Anda"
                  className="w-full px-3 py-2.5 border border-[#e5e7eb] rounded-lg text-[14px] text-[#0e0e0e] outline-none focus:border-[#0e0e0e] focus:shadow-[0_0_0_3px_rgba(14,14,14,0.07)] transition-all bg-white tracking-widest"
                />
              </div>

              <button
                onClick={handleLogin}
                disabled={loading}
                className="w-full bg-[#0e0e0e] text-white py-2.5 rounded-lg text-[14px] font-bold flex items-center justify-center gap-2 hover:opacity-80 transition-opacity disabled:opacity-40 mt-1"
              >
                {loading ? "Memeriksa..." : "Masuk"}
              </button>
            </div>

            <div className="h-px bg-[#e5e7eb] my-3.5"></div>

            <p className="text-[12px] text-[#9ca3af] text-center">
              Belum punya akun? Hubungi admin untuk didaftarkan.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ResellerLoginPage() {
  return (
    <Suspense fallback={null}>
      <ResellerLoginContent />
    </Suspense>
  );
}
