"use client";

import { POOrder } from "@/types/po";
import { formatRupiah } from "@/lib/po/pricing";

/**
 * Komponen ini murni untuk TAMPILAN CETAK (A4).
 * Tidak ada interaksi di dalamnya — dirender tersembunyi di layar,
 * lalu di-print / di-screenshot jadi PDF oleh POOrderList.tsx.
 *
 * Catatan:
 * - `storeName` & `logoUrl` sengaja dibuat sebagai props opsional.
 *   Kalau kamu punya nama toko / logo di tabel po_settings, sambungkan
 *   dari sana (mis. setting.store_name, setting.logo_url). Kalau belum
 *   ada kolomnya, tinggal hardcode dulu.
 *
 * Styling: mengikuti resep "Dokumen / tiket hasil render (html-to-image)"
 * dari THEME-GUIDE "LCO Flat" — dipaksa light-mode penuh, palet zinc,
 * angka/kode pakai font-mono tabular-nums, status pakai stempel border-2.
 */

interface POOrderPrintSlipProps {
  order: POOrder;
  storeName?: string;
  logoUrl?: string;
  storeAddress?: string;
}

const PAYMENT_LABEL: Record<string, string> = {
  BELUM_BAYAR: "Belum Bayar",
  DP: "DP",
  LUNAS: "Lunas",
};

// Warna stempel status pembayaran, mengikuti token status tema (border + teks).
const PAYMENT_STAMP: Record<string, string> = {
  BELUM_BAYAR: "border-red-600 text-red-600",
  DP: "border-orange-600 text-orange-600",
  LUNAS: "border-emerald-600 text-emerald-600",
};

export default function POOrderPrintSlip({
  order,
  storeName = "Nama Toko",
  logoUrl,
  storeAddress,
}: POOrderPrintSlipProps) {
  const printedAt = new Date().toLocaleString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const sisaTagihan = Math.max(
    0,
    order.total_amount - (order.paid_amount || 0),
  );

  const paymentStamp =
    PAYMENT_STAMP[order.payment_status] ?? PAYMENT_STAMP.BELUM_BAYAR;

  // Urutkan item: kode/nama produk -> lengan -> warna -> ukuran.
  const sortedItems = [...order.order_items].sort((a, b) => {
    const kodeA = a.product_name || "";
    const kodeB = b.product_name || "";
    if (kodeA !== kodeB)
      return kodeA.localeCompare(kodeB, undefined, { numeric: true });

    const lenganA = a.lengan || "";
    const lenganB = b.lengan || "";
    if (lenganA !== lenganB) return lenganA.localeCompare(lenganB);

    const warnaA = a.warna || "";
    const warnaB = b.warna || "";
    if (warnaA !== warnaB) return warnaA.localeCompare(warnaB);

    return (a.ukuran || "").localeCompare(b.ukuran || "", undefined, {
      numeric: true,
    });
  });

  const storeInitials = storeName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

  return (
    <div
      id="po-print-area"
      className="w-[210mm] min-h-[297mm] mx-auto bg-white text-zinc-800"
      style={{ fontFamily: "Arial, Helvetica, sans-serif", fontSize: "12px" }}
    >
      {/* ── Header toko ─────────────────────────────────────── */}
      <div className={logoUrl ? "" : "border-b-2 border-zinc-900"}>
        {logoUrl ? (
          // Gambar kop/header custom, selebar penuh kertas (edge-to-edge) —
          // dianggap sudah lengkap dengan nama, alamat, kontak di dalam
          // desainnya sendiri, jadi tidak perlu elemen teks tambahan di sini.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt={storeName} className="w-full h-auto block" />
        ) : (
          // Fallback: avatar inisial + nama toko, dipakai hanya kalau
          // logo/kop belum diupload.
          <div
            className="flex items-center gap-3"
            style={{ padding: "15mm 15mm 14px" }}
          >
            <div className="w-12 h-12 rounded-md bg-zinc-100 text-zinc-900 flex items-center justify-center font-semibold text-base shrink-0">
              {storeInitials || "T"}
            </div>
            <div>
              <p className="text-base font-semibold m-0">{storeName}</p>
              {storeAddress && (
                <p className="text-[10px] text-zinc-500 mt-0.5 mb-0">
                  {storeAddress}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Bar detail pesanan (dulunya di header, sekarang di bawah kop) ── */}
      <div
        className="flex justify-between items-center flex-wrap gap-4 bg-zinc-50 border-b border-zinc-200"
        style={{ padding: "14px 15mm" }}
      >
        <div>
          <p className="text-[9px] font-mono uppercase tracking-[0.14em] text-zinc-400 m-0">
            STRUK PESANAN
          </p>
          <p className="text-base font-semibold font-mono tabular-nums mt-1 mb-0">
            {order.po_number}
          </p>
        </div>
        <div>
          <p className="text-[9px] font-mono uppercase tracking-[0.14em] text-zinc-400 m-0">
            TIPE CUSTOMER
          </p>
          <p className="text-[13px] font-semibold mt-1 mb-0">
            {order.customer_type}
          </p>
        </div>
        <div>
          <p className="text-[9px] font-mono uppercase tracking-[0.14em] text-zinc-400 m-0">
            TANGGAL
          </p>
          <p className="text-[13px] font-semibold font-mono tabular-nums mt-1 mb-0">
            {new Date(order.created_at).toLocaleDateString("id-ID", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[9px] font-mono uppercase tracking-[0.14em] text-zinc-400 mb-1.5">
            STATUS BAYAR
          </p>
          <span
            className={`inline-block px-2.5 py-0.5 rounded-md border-2 text-[10px] font-mono font-semibold uppercase tracking-[0.1em] ${paymentStamp}`}
          >
            {PAYMENT_LABEL[order.payment_status] ?? order.payment_status}
          </span>
        </div>
      </div>

      <div style={{ padding: "0 15mm" }}>
        {/* ── Info pelanggan ────────────────────────────────── */}
        <table className="w-full my-4 text-xs">
          <tbody>
            <tr>
              <td className="w-1/2 align-top p-0">
                <p className="text-[9px] font-mono uppercase tracking-[0.14em] text-zinc-400 mb-1.5">
                  PELANGGAN
                </p>
                <p className="font-semibold mb-0.5">{order.customer_name}</p>
                <p className="text-zinc-500 mb-0.5">{order.customer_wa}</p>
                {order.po_resellers && (
                  <p className="text-zinc-500 m-0">
                    Reseller: {order.po_resellers.nama} (
                    {order.po_resellers.kode})
                  </p>
                )}
              </td>
              <td className="w-1/2 align-top p-0">
                <p className="text-[9px] font-mono uppercase tracking-[0.14em] text-zinc-400 mb-1.5">
                  PENGIRIMAN
                </p>
                <p className="font-semibold mb-0.5">{order.delivery_method}</p>
                {order.shipping_address && (
                  <p className="text-zinc-500 mb-0.5">
                    {order.shipping_address}
                  </p>
                )}
              </td>
            </tr>
          </tbody>
        </table>

        {/* ── Tabel item ────────────────────────────────────── */}
        <table className="w-full border-collapse mb-4 text-[11px]">
          <thead>
            <tr className="bg-zinc-50">
              <th className="text-left py-2 px-2.5 font-semibold text-zinc-500 rounded-l-md">
                Produk
              </th>
              <th className="text-center py-2 px-1.5 font-semibold text-zinc-500">
                Warna
              </th>
              <th className="text-center py-2 px-1.5 font-semibold text-zinc-500">
                Lengan
              </th>
              <th className="text-center py-2 px-1.5 font-semibold text-zinc-500">
                Ukuran
              </th>
              <th className="text-center py-2 px-1.5 font-semibold text-zinc-500">
                Qty
              </th>
              <th className="text-right py-2 px-1.5 font-semibold text-zinc-500">
                Harga
              </th>
              <th className="text-right py-2 px-2.5 font-semibold text-zinc-500 rounded-r-md">
                Subtotal
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedItems.map((item, i) => (
              <tr
                key={i}
                className={
                  i === order.order_items.length - 1
                    ? ""
                    : "border-b border-zinc-200"
                }
              >
                <td className="py-2.5 px-2.5 font-semibold">
                  {item.product_name}
                </td>
                <td className="py-2.5 px-1.5 text-center text-zinc-500">
                  {item.warna}
                </td>
                <td className="py-2.5 px-1.5 text-center text-zinc-500">
                  {item.lengan}
                </td>
                <td className="py-2.5 px-1.5 text-center text-zinc-500">
                  {item.ukuran}
                </td>
                <td className="py-2.5 px-1.5 text-center font-mono tabular-nums">
                  {item.qty}
                </td>
                <td className="py-2.5 px-1.5 text-right text-zinc-500 font-mono tabular-nums">
                  {formatRupiah(item.harga_satuan)}
                </td>
                <td className="py-2.5 px-2.5 text-right font-semibold font-mono tabular-nums">
                  {formatRupiah(item.subtotal)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* ── Total ─────────────────────────────────────────── */}
        <div className="flex justify-end mb-5">
          <div className="min-w-[260px] bg-zinc-50 rounded-md p-3.5 text-xs">
            <div className="flex justify-between py-0.5">
              <span className="text-zinc-500">Total</span>
              <span className="font-semibold font-mono tabular-nums">
                {formatRupiah(order.total_amount)}
              </span>
            </div>

            {order.payment_status !== "BELUM_BAYAR" && (
              <div className="flex justify-between py-0.5">
                <span className="text-zinc-500">Sudah Dibayar</span>
                <span className="font-mono tabular-nums">
                  {formatRupiah(order.paid_amount || 0)}
                </span>
              </div>
            )}

            {sisaTagihan > 0 ? (
              <div className="flex justify-between pt-2 mt-1.5 border-t border-zinc-300 text-[13px]">
                <span className="font-semibold text-red-600">Sisa Tagihan</span>
                <span className="font-semibold font-mono tabular-nums text-red-600">
                  {formatRupiah(sisaTagihan)}
                </span>
              </div>
            ) : (
              <div className="flex justify-between pt-2 mt-1.5 border-t border-zinc-300 text-[13px]">
                <span className="font-semibold">Lunas</span>
                <span className="font-semibold font-mono tabular-nums text-emerald-600">
                  Rp 0
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ── Catatan ───────────────────────────────────────── */}
        {order.notes && (
          <div className="border-l-2 border-zinc-900 bg-zinc-50 rounded-r-md py-2 px-3.5 mb-6 text-[11px]">
            <p className="font-semibold mb-1">Catatan Pembeli:</p>
            <p className="text-zinc-600 m-0">{order.notes}</p>
          </div>
        )}

        {/* ── Tanda tangan ──────────────────────────────────── */}
        <table className="w-full mt-12 text-[11px]">
          <tbody>
            <tr>
              <td className="w-1/2 text-center">
                <div className="border-t border-zinc-400 pt-2 mx-6 text-zinc-500">
                  Disiapkan oleh
                </div>
              </td>
              <td className="w-1/2 text-center">
                <div className="border-t border-zinc-400 pt-2 mx-6 text-zinc-500">
                  Tanda Tangan Penerima
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <p
          className="text-center text-[9px] text-zinc-400 mt-8"
          style={{ marginBottom: "15mm" }}
        >
          Dicetak {printedAt}
        </p>
      </div>
    </div>
  );
}
