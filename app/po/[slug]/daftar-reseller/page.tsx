"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  UserPlus,
  User,
  Phone,
  MapPin,
  Lock,
  Tag,
  CheckCircle2,
  Loader2,
  AlertCircle,
  MessageCircleMore,
} from "lucide-react";
import { registerReseller, getPOSettingPublic } from "@/lib/po/public";
import { buildRegistrationMessage, buildWaLink } from "@/lib/po/wa-messages";
import SyaratKetentuanModal from "./SyaratKetentuanModal";

const EMPTY_FORM = {
  nama: "",
  panggilan: "",
  whatsapp: "",
  pin: "",
  alamatJalan: "",
  desa: "",
  kecamatan: "",
  kabupaten: "",
  provinsi: "",
};

export default function DaftarResellerPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const [form, setForm] = useState(EMPTY_FORM);
  const [agreed, setAgreed] = useState(false);
  const [showSK, setShowSK] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adminPhone, setAdminPhone] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    getPOSettingPublic(slug).then((s) => {
      if (s?.wa_admin_phone) setAdminPhone(s.wa_admin_phone);
    });
  }, [slug]);

  const isFormValid =
    form.nama.trim() &&
    form.panggilan.trim() &&
    form.whatsapp.trim() &&
    form.pin.trim() &&
    form.alamatJalan.trim() &&
    form.desa.trim() &&
    form.kecamatan.trim() &&
    form.kabupaten.trim() &&
    form.provinsi.trim() &&
    agreed;

  async function handleSubmit() {
    if (!isFormValid) return;
    setSubmitting(true);
    setError(null);

    const fullAlamat = `${form.alamatJalan}, Desa/Kel. ${form.desa}, Kec. ${form.kecamatan}, Kab/Kota ${form.kabupaten}, Prov. ${form.provinsi}`;

    const result = await registerReseller({
      nama: form.nama,
      kode: form.panggilan,
      whatsapp: form.whatsapp,
      alamat: fullAlamat,
      kota: form.kabupaten,
      pin_hash: form.pin,
    });

    setSubmitting(false);

    if (!result.success) {
      setError(result.error || "Gagal mendaftar. Silakan coba lagi.");
      return;
    }

    setDone(true);
  }

  /* ── Tampilan Setelah Berhasil (Senada dengan Modal) ────────── */
  if (done) {
    const fullAlamat = `${form.alamatJalan}, Desa/Kel. ${form.desa}, Kec. ${form.kecamatan}, Kab/Kota ${form.kabupaten}, Prov. ${form.provinsi}`;
    const waLink = adminPhone
      ? buildWaLink(
          adminPhone,
          buildRegistrationMessage({
            nama: form.nama,
            panggilan: form.panggilan,
            whatsapp: form.whatsapp,
            alamat: fullAlamat,
            pin: form.pin,
          }),
        )
      : null;

    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
        <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl p-8 animate-in fade-in zoom-in-95 duration-200 text-center">
          <div className="mx-auto w-fit p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl text-emerald-600 dark:text-emerald-400 mb-4">
            <CheckCircle2 size={32} />
          </div>
          <h2 className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">
            Pendaftaran Terekam
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
            Data Anda sudah tersimpan. Langkah terakhir, kirim konfirmasi via
            WhatsApp ke admin supaya akun Anda segera diaktifkan.
          </p>

          <div className="mt-6">
            {waLink ? (
              <a
                href={waLink}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl text-sm font-bold transition-colors"
              >
                <MessageCircleMore size={16} />
                Konfirmasi via WhatsApp
              </a>
            ) : (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                Nomor WA admin belum tersedia. Silakan hubungi admin secara
                manual.
              </p>
            )}
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-2.5">
              Admin akan mengonfirmasi akun Anda setelah pesan diterima.
            </p>
          </div>
        </div>
      </div>
    );
  }

  /* ── Form Utama ────────────────────────────────────────────────── */
  return (
    <div className="min-h-dvh bg-slate-50 dark:bg-slate-950 flex justify-center py-8 px-4 sm:py-12">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl h-fit animate-in fade-in slide-in-from-bottom-4 duration-300">
        {/* HEADER (Sama Persis dengan SyaratKetentuanModal) */}
        <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-t-2xl">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 dark:bg-blue-950/40 rounded-xl text-blue-600 dark:text-blue-400">
              <UserPlus size={16} />
            </div>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-blue-500 dark:text-blue-400">
                Pendaftaran
              </p>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
                Daftar Reseller Baru
              </h3>
            </div>
          </div>
        </div>

        {/* BODY (Sama dengan SyaratKetentuanModal) */}
        <div className="px-5 py-5 space-y-4">
          {/* Baris 1: Nama & Panggilan (2 Kolom di layar besar) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
                <User size={11} /> Nama Lengkap{" "}
                <span className="text-blue-500">*</span>
              </label>
              <input
                type="text"
                value={form.nama}
                onChange={(e) => setForm({ ...form, nama: e.target.value })}
                placeholder="Nama lengkap Anda"
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
              />
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
                <Tag size={11} /> Nama Panggilan{" "}
                <span className="text-blue-500">*</span>
              </label>
              <input
                type="text"
                value={form.panggilan}
                onChange={(e) => {
                  // PERBAIKAN: Otomatis huruf besar & hilangkan spasi
                  const value = e.target.value.toUpperCase().replace(/\s/g, "");
                  setForm({ ...form, panggilan: value });
                }}
                placeholder="USERNAME" // placeholder diubah agar relevan
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-mono text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
              />
              {/* Tambahan hint agar user lebih paham */}
              <p className="text-[10px] text-slate-400 mt-1.5 leading-relaxed">
                Tanpa spasi. Dipakai sebagai username login.
              </p>
            </div>
          </div>

          {/* WhatsApp & PIN */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
                <Phone size={11} /> Nomor WhatsApp{" "}
                <span className="text-blue-500">*</span>
              </label>
              <input
                type="text"
                value={form.whatsapp}
                onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                placeholder="628123456789"
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
              />
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
                <Lock size={11} /> PIN/Sandi Login{" "}
                <span className="text-blue-500">*</span>
              </label>
              <input
                type="password"
                value={form.pin}
                onChange={(e) => setForm({ ...form, pin: e.target.value })}
                placeholder="Mudah diingat"
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
              />
            </div>
          </div>

          {/* Kotak Alamat */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 space-y-3">
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide border-b border-slate-200 dark:border-slate-700 pb-2">
              <MapPin size={13} />
              Data Alamat Pengiriman
            </label>

            <div className="grid grid-cols-2 gap-3 mt-2">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">
                  PROVINSI <span className="text-blue-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.provinsi}
                  onChange={(e) =>
                    setForm({ ...form, provinsi: e.target.value })
                  }
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">
                  KABUPATEN/KOTA <span className="text-blue-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.kabupaten}
                  onChange={(e) =>
                    setForm({ ...form, kabupaten: e.target.value })
                  }
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">
                  KECAMATAN <span className="text-blue-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.kecamatan}
                  onChange={(e) =>
                    setForm({ ...form, kecamatan: e.target.value })
                  }
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">
                  DESA/KELURAHAN <span className="text-blue-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.desa}
                  onChange={(e) => setForm({ ...form, desa: e.target.value })}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1">
                JALAN / DETAIL ALAMAT <span className="text-blue-500">*</span>
              </label>
              <textarea
                value={form.alamatJalan}
                onChange={(e) =>
                  setForm({ ...form, alamatJalan: e.target.value })
                }
                rows={2}
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all resize-none"
              />
            </div>
          </div>

          {/* S&K checkbox */}
          <label className="flex items-start gap-2.5 pt-2 cursor-pointer">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => {
                if (e.target.checked) {
                  // Jika user mau mencentang, paksa buka modal S&K dulu
                  setShowSK(true);
                } else {
                  // Jika user menghilangkan centang
                  setAgreed(false);
                }
              }}
              className="mt-0.5 w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500/30"
            />
            <span className="text-sm text-slate-600 dark:text-slate-300">
              Saya menyetujui{" "}
              <button
                type="button"
                onClick={() => setShowSK(true)}
                className="text-blue-600 dark:text-blue-400 font-bold hover:underline"
              >
                syarat &amp; ketentuan
              </button>{" "}
              yang berlaku.
            </span>
          </label>

          {/* Error Notice */}
          {error && (
            <div className="flex items-start gap-2 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 text-sm px-3.5 py-2.5 rounded-xl">
              <AlertCircle size={15} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="px-5 pb-5">
          <button
            onClick={handleSubmit}
            disabled={!isFormValid || submitting}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white py-2.5 rounded-xl text-sm font-bold transition-colors"
          >
            {submitting ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                Mendaftarkan...
              </>
            ) : (
              "Daftar Sekarang"
            )}
          </button>
        </div>
      </div>

      {/* Tambahkan properti onAgree di sini */}
      <SyaratKetentuanModal
        open={showSK}
        onClose={() => setShowSK(false)}
        onAgree={() => {
          setAgreed(true); // Centang checkbox otomatis
          setShowSK(false); // Tutup modal
        }}
      />
    </div>
  );
}
