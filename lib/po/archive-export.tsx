// lib/po/archive-export.tsx
//
// Utilitas untuk mengarsipkan SELURUH data satu campaign PO (pesanan,
// produk, reseller yang terlibat, pengaturan toko) beserta semua gambar
// (foto produk, logo toko, QRIS) DAN PDF invoice + resi per pesanan
// (dipisah folder reseller/public) — menjadi satu file ZIP yang bisa
// diunduh dan disimpan sebagai arsip sebelum PO tersebut dihapus permanen.
//
// Dependensi tambahan yang WAJIB di-install di project ini:
//   npm install jszip
// (xlsx, html2canvas-pro, jspdf sudah dipakai di POOrderList.tsx, jadi
// tidak perlu install ulang)
//
// Catatan: file ini berisi JSX (merender POOrderPrintSlip & POOrderReceiptA6
// ke canvas tersembunyi untuk dijadikan PDF), makanya ekstensinya .tsx.

import { BRAND_NAME, STORE_ADDRESS } from "@/lib/brand";
import {
  getAllPOOrders,
  getAllPOProducts,
  getAllResellers,
  getPOSettingAdmin,
} from "@/lib/po/admin";
import { POOrder, POProduct, POResellerFull, POSetting } from "@/types/po";

// Sesuaikan path import ini kalau lokasi folder komponennya berbeda
// di project Anda (di POOrderList.tsx / POPackingList.tsx keduanya
// diimpor dengan "./POOrderPrintSlip" & "./POOrderReceiptA6" karena
// satu folder — ganti ke path relatif itu kalau lebih cocok).
import POOrderPrintSlip from "@/app/components/po/POOrderPrintSlip";
import POOrderReceiptA6 from "@/app/components/po/POOrderReceiptA6";

export type ArchiveProgress = (message: string) => void;

export interface ArchiveOptions {
  /** Sertakan PDF invoice (A4) + resi (A6) per pesanan. Default: true. */
  includeOrderPdfs?: boolean;
  storeName?: string;
  storeAddress?: string;
}

const PAYMENT_LABEL: Record<string, string> = {
  BELUM_BAYAR: "Belum Bayar",
  DP: "DP",
  LUNAS: "Lunas",
};

/* ── Helper kecil ─────────────────────────────────────────────────── */

function safeName(s: string, fallback = "file") {
  const cleaned = (s || fallback)
    .toString()
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, " ");
  return cleaned || fallback;
}

function extFromUrl(url: string) {
  try {
    const clean = url.split("?")[0].split("#")[0];
    const match = clean.match(/\.([a-zA-Z0-9]{2,5})$/);
    return match ? match[1].toLowerCase() : "jpg";
  } catch {
    return "jpg";
  }
}

function formatTanggal(iso: string) {
  try {
    return new Date(iso).toLocaleString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

/**
 * Unduh satu gambar sebagai Blob. Mengembalikan null (bukan melempar error)
 * kalau gagal, supaya satu gambar rusak/hilang tidak menggagalkan seluruh
 * proses arsip.
 */
async function fetchImageBlob(url: string): Promise<Blob | null> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    return await res.blob();
  } catch {
    return null;
  }
}

/* ── Render komponen React (invoice/resi) jadi canvas tersembunyi ──── */

async function waitForImages(container: HTMLElement, timeoutMs = 8000) {
  const imgs = Array.from(container.querySelectorAll("img"));
  if (imgs.length === 0) return;
  await Promise.race([
    Promise.all(
      imgs.map(
        (img) =>
          new Promise<void>((resolve) => {
            if (img.complete) return resolve();
            img.onload = () => resolve();
            img.onerror = () => resolve();
          }),
      ),
    ),
    new Promise((resolve) => setTimeout(resolve, timeoutMs)),
  ]);
}

async function renderElementToCanvas(
  element: React.ReactElement,
  widthMm: number,
  scale = 2.2,
): Promise<HTMLCanvasElement> {
  const html2canvas = (await import("html2canvas-pro")).default;
  const { createRoot } = await import("react-dom/client");

  const MM_TO_PX = 3.7795275591; // ~96dpi
  const widthPx = Math.round(widthMm * MM_TO_PX);

  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "-99999px";
  container.style.top = "0";
  container.style.width = `${widthPx}px`;
  container.style.background = "#ffffff";
  document.body.appendChild(container);

  const root = createRoot(container);
  root.render(element);

  // Beri waktu React commit + browser hitung layout, lalu tunggu gambar
  // (logo toko, dsb) selesai dimuat sebelum di-screenshot.
  await new Promise((r) => setTimeout(r, 60));
  await waitForImages(container);
  await new Promise((r) => requestAnimationFrame(() => r(null)));

  try {
    return await html2canvas(container, {
      scale,
      backgroundColor: "#ffffff",
      useCORS: true,
    });
  } finally {
    root.unmount();
    container.remove();
  }
}

/** Potong canvas panjang jadi beberapa halaman PDF (sama seperti logika di POOrderList.tsx). */
async function canvasToPdfBlob(
  canvas: HTMLCanvasElement,
  format: { pageWidthMm: number; pageHeightMm: number; marginMm: number },
): Promise<Blob> {
  const { jsPDF } = await import("jspdf");

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [format.pageWidthMm, format.pageHeightMm],
    compress: true,
  });

  const contentWidthMM = format.pageWidthMm - format.marginMm * 2;
  const contentHeightMM = format.pageHeightMm - format.marginMm * 2;

  const pxPerMm = canvas.width / contentWidthMM;
  const pageHeightPx = Math.max(1, Math.floor(contentHeightMM * pxPerMm));
  const totalPages = Math.max(1, Math.ceil(canvas.height / pageHeightPx));

  for (let i = 0; i < totalPages; i++) {
    const sourceY = i * pageHeightPx;
    const sliceHeightPx = Math.min(pageHeightPx, canvas.height - sourceY);

    const pageCanvas = document.createElement("canvas");
    pageCanvas.width = canvas.width;
    pageCanvas.height = sliceHeightPx;
    const ctx = pageCanvas.getContext("2d");
    if (!ctx) continue;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
    ctx.drawImage(
      canvas,
      0,
      sourceY,
      canvas.width,
      sliceHeightPx,
      0,
      0,
      canvas.width,
      sliceHeightPx,
    );

    const sliceImgData = pageCanvas.toDataURL("image/jpeg", 0.82);
    const sliceHeightMM = sliceHeightPx / pxPerMm;

    if (i > 0) pdf.addPage([format.pageWidthMm, format.pageHeightMm]);
    pdf.addImage(
      sliceImgData,
      "JPEG",
      format.marginMm,
      format.marginMm,
      contentWidthMM,
      sliceHeightMM,
      undefined,
      "FAST",
    );
  }

  return pdf.output("blob");
}

async function buildInvoicePdf(
  order: POOrder,
  setting: POSetting | null,
  storeName: string,
  storeAddress: string,
): Promise<Blob> {
  const canvas = await renderElementToCanvas(
    <POOrderPrintSlip
      order={order}
      storeName={storeName}
      storeAddress={storeAddress}
      logoUrl={setting?.logo_image_url || undefined}
    />,
    210, // A4 width, sama seperti lebar asli komponen (210mm)
  );
  return canvasToPdfBlob(canvas, {
    pageWidthMm: 210,
    pageHeightMm: 297,
    marginMm: 10,
  });
}

async function buildReceiptPdf(
  order: POOrder,
  setting: POSetting | null,
  storeName: string,
  storeAddress: string,
): Promise<Blob> {
  // POOrderReceiptA6 sendiri tidak punya ukuran kertas/padding baku —
  // aslinya dibungkus lewat CSS cetak di POShippingList.tsx
  // (.po-print-page { width:105mm; padding:7mm; }). Kita bungkus dengan
  // wrapper yang sama persis di sini.
  const canvas = await renderElementToCanvas(
    <div
      style={{
        width: "105mm",
        minHeight: "148mm",
        padding: "7mm",
        boxSizing: "border-box",
        background: "#ffffff",
      }}
    >
      <POOrderReceiptA6
        order={order}
        storeName={storeName}
        storeAddress={storeAddress}
        adminPhone={setting?.wa_admin_phone || ""}
        logoUrl={setting?.logo_image_url || undefined}
      />
    </div>,
    105, // A6 width
  );
  return canvasToPdfBlob(canvas, {
    pageWidthMm: 105,
    pageHeightMm: 148,
    marginMm: 0, // padding sudah dibuat di dalam wrapper di atas
  });
}

/* ── Bangun workbook Excel (data mentah, semua tabel) ──────────────── */

function buildWorkbook(
  XLSX: typeof import("xlsx"),
  poTitle: string,
  setting: POSetting | null,
  orders: POOrder[],
  products: POProduct[],
  resellers: POResellerFull[],
) {
  const wb = XLSX.utils.book_new();

  /* Sheet 1: Info PO */
  const infoRows = [
    { Field: "Judul PO", Value: poTitle || setting?.title || "-" },
    { Field: "Slug URL", Value: setting?.url_slug || "-" },
    { Field: "Status", Value: setting?.is_active ? "Aktif" : "Tidak Aktif" },
    { Field: "Periode Mulai", Value: setting?.periode_mulai || "-" },
    { Field: "Periode Selesai", Value: setting?.periode_selesai || "-" },
    { Field: "No. WA Admin", Value: setting?.wa_admin_phone || "-" },
    {
      Field: "Biaya Tambahan Lengan Panjang",
      Value: setting?.sleeve_surcharge ?? 0,
    },
    { Field: "Biaya Tambahan XXL", Value: setting?.xxl_surcharge ?? 0 },
    {
      Field: "Biaya Tambahan Sweater XXL",
      Value: setting?.sweater_xxl_surcharge ?? 0,
    },
    { Field: "Total Pesanan", Value: orders.length },
    { Field: "Total Produk", Value: products.length },
    { Field: "Total Reseller Terlibat", Value: resellers.length },
    { Field: "Tanggal Diarsipkan", Value: new Date().toLocaleString("id-ID") },
  ];
  const wsInfo = XLSX.utils.json_to_sheet(infoRows, { skipHeader: false });
  wsInfo["!cols"] = [{ wch: 30 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, wsInfo, "Info PO");

  /* Sheet 2: Rekap Pesanan (1 baris = 1 order) */
  const orderRows = orders.map((o) => ({
    "Kode PO": o.po_number,
    Tipe: o.customer_type,
    Reseller: o.po_resellers
      ? `${o.po_resellers.nama} (${o.po_resellers.kode})`
      : "-",
    Pelanggan: o.customer_name,
    WhatsApp: o.customer_wa,
    "Status Bayar": PAYMENT_LABEL[o.payment_status] ?? o.payment_status,
    "Jumlah Dibayar": o.paid_amount || 0,
    "Sisa Tagihan": Math.max(0, o.total_amount - (o.paid_amount || 0)),
    "Metode Kirim": o.delivery_method,
    Alamat: o.shipping_address || "-",
    "Jumlah Item": o.order_items.reduce((s, i) => s + i.qty, 0),
    "Total (Rp)": o.total_amount,
    Catatan: o.notes || "-",
    Tanggal: formatTanggal(o.created_at),
  }));
  const wsOrders = XLSX.utils.json_to_sheet(orderRows);
  wsOrders["!cols"] = [
    { wch: 14 },
    { wch: 10 },
    { wch: 22 },
    { wch: 20 },
    { wch: 16 },
    { wch: 13 },
    { wch: 14 },
    { wch: 14 },
    { wch: 12 },
    { wch: 28 },
    { wch: 12 },
    { wch: 14 },
    { wch: 24 },
    { wch: 18 },
  ];
  XLSX.utils.book_append_sheet(wb, wsOrders, "Rekap Pesanan");

  /* Sheet 3: Detail Item (1 baris = 1 item produk dalam pesanan) */
  const itemRows: Record<string, any>[] = [];
  orders.forEach((o) => {
    o.order_items.forEach((item) => {
      itemRows.push({
        "Kode PO": o.po_number,
        Pelanggan: o.customer_name,
        Produk: item.product_name,
        Warna: item.warna,
        Lengan: item.lengan,
        Ukuran: item.ukuran,
        Qty: item.qty,
        "Harga Satuan": item.harga_satuan,
        Subtotal: item.subtotal,
        Tanggal: formatTanggal(o.created_at),
      });
    });
  });
  const wsItems = XLSX.utils.json_to_sheet(itemRows);
  wsItems["!cols"] = [
    { wch: 14 },
    { wch: 20 },
    { wch: 22 },
    { wch: 12 },
    { wch: 10 },
    { wch: 10 },
    { wch: 8 },
    { wch: 14 },
    { wch: 14 },
    { wch: 18 },
  ];
  XLSX.utils.book_append_sheet(wb, wsItems, "Detail Item");

  /* Sheet 4: Rekap Produksi (pivot per produk x warna x lengan x ukuran) */
  const allSizes = Array.from(
    new Set<string>([
      ...products.flatMap((p) => p.available_sizes || []),
      ...orders.flatMap((o) => o.order_items.map((i) => i.ukuran)),
    ]),
  );
  const rekapMap = new Map<string, Record<string, any>>();
  orders.forEach((o) => {
    o.order_items.forEach((item) => {
      const key = `${item.product_name}::${item.warna}::${item.lengan}`;
      if (!rekapMap.has(key)) {
        const base: Record<string, any> = {
          Produk: item.product_name,
          Warna: item.warna,
          Lengan: item.lengan,
        };
        allSizes.forEach((sz) => (base[sz] = 0));
        base["Total"] = 0;
        rekapMap.set(key, base);
      }
      const row = rekapMap.get(key)!;
      row[item.ukuran] = (row[item.ukuran] || 0) + item.qty;
      row["Total"] += item.qty;
    });
  });
  const rekapRows = Array.from(rekapMap.values()).sort((a, b) =>
    a.Produk.localeCompare(b.Produk),
  );
  if (rekapRows.length > 0) {
    const wsRekap = XLSX.utils.json_to_sheet(rekapRows);
    XLSX.utils.book_append_sheet(wb, wsRekap, "Rekap Produksi");
  }

  /* Sheet 5: Katalog Produk */
  const productRows = products.map((p) => ({
    "Kode Produk": p.product_code,
    Nama: p.name,
    Kategori: p.category,
    "Jenis Garment": p.garment_type,
    "Harga Dasar": p.base_price,
    Ukuran: (p.available_sizes || []).join(", "),
    Lengan: (p.sleeve_types || []).join(", "),
    Warna: (p.colors || []).join(", "),
    "Jumlah Gambar": (p.image_urls || []).length,
    Aktif: p.is_active ? "Ya" : "Tidak",
    Deskripsi: p.description || "-",
  }));
  const wsProducts = XLSX.utils.json_to_sheet(productRows);
  wsProducts["!cols"] = [
    { wch: 14 },
    { wch: 24 },
    { wch: 12 },
    { wch: 16 },
    { wch: 14 },
    { wch: 16 },
    { wch: 16 },
    { wch: 20 },
    { wch: 12 },
    { wch: 8 },
    { wch: 30 },
  ];
  XLSX.utils.book_append_sheet(wb, wsProducts, "Produk");

  /* Sheet 6: Reseller yang terlibat di PO ini */
  const resellerRows = resellers.map((r) => ({
    Kode: r.kode,
    Nama: r.nama,
    WhatsApp: r.whatsapp || "-",
    Kota: r.kota || "-",
  }));
  const wsResellers = XLSX.utils.json_to_sheet(resellerRows);
  wsResellers["!cols"] = [{ wch: 12 }, { wch: 22 }, { wch: 16 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, wsResellers, "Reseller");

  return wb;
}

/* ── Fungsi utama: bangun & unduh ZIP arsip ─────────────────────────── */

export async function downloadPOArchive(
  poId: string,
  poTitleFallback: string,
  onProgress?: ArchiveProgress,
  options?: ArchiveOptions,
): Promise<void> {
  const report = (msg: string) => onProgress?.(msg);
  const includeOrderPdfs = options?.includeOrderPdfs ?? true;
  const storeName = options?.storeName ?? BRAND_NAME;
  const storeAddress =
    options?.storeAddress ?? STORE_ADDRESS;

  report("Mengambil data pesanan, produk, dan pengaturan...");
  const [orders, products, setting, allResellers] = await Promise.all([
    getAllPOOrders(poId),
    getAllPOProducts(poId),
    getPOSettingAdmin(poId),
    getAllResellers(),
  ]);

  // Reseller tidak terikat langsung ke satu PO (dipakai bersama), jadi
  // ambil hanya reseller yang benar-benar punya pesanan di PO ini.
  const kodeTerlibat = new Set(
    orders
      .map((o) => o.po_resellers?.kode)
      .filter((k): k is string => Boolean(k)),
  );
  const resellers = allResellers.filter((r) => kodeTerlibat.has(r.kode));

  const poTitle = setting?.title || poTitleFallback || "PO";
  const slug = safeName(setting?.url_slug || poId.slice(0, 8));

  report("Menyusun file Excel (pesanan, produk, rekap produksi)...");
  const [XLSX, JSZipModule] = await Promise.all([
    import("xlsx"),
    import("jszip"),
  ]);
  const JSZip = JSZipModule.default;

  const wb = buildWorkbook(XLSX, poTitle, setting, orders, products, resellers);
  const xlsxBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });

  const zip = new JSZip();
  zip.file(`Data-Arsip-PO-${slug}.xlsx`, xlsxBuffer);

  zip.file(
    "BACA-SAYA.txt",
    [
      `ARSIP DATA PRE-ORDER`,
      `Judul PO   : ${poTitle}`,
      `Slug       : ${slug}`,
      `Diarsipkan : ${new Date().toLocaleString("id-ID")}`,
      ``,
      `Isi arsip ini:`,
      `- Data-Arsip-PO-${slug}.xlsx  → semua data mentah (pesanan, detail item,`,
      `  rekap produksi per ukuran, katalog produk, reseller).`,
      `- gambar-produk/                → foto tiap produk di katalog.`,
      `- logo-toko.*  dan  qris.*       → aset pengaturan toko (jika ada).`,
      includeOrderPdfs
        ? `- invoice-resi/reseller/        → PDF invoice + resi tiap pesanan reseller.`
        : ``,
      includeOrderPdfs
        ? `- invoice-resi/public/          → PDF invoice + resi tiap pesanan public.`
        : ``,
      ``,
      `Arsip ini dibuat sebelum PO dihapus dari sistem, agar data tetap`,
      `tersimpan untuk kebutuhan laporan/rekap di kemudian hari.`,
    ]
      .filter(Boolean)
      .join("\n"),
  );

  // ── Kumpulkan gambar produk/setting yang perlu diunduh ──
  type ImgJob = { url: string; path: string };
  const jobs: ImgJob[] = [];

  products.forEach((p) => {
    (p.image_urls || []).forEach((url, idx) => {
      const base = safeName(p.product_code || p.name || `produk-${idx + 1}`);
      jobs.push({
        url,
        path: `gambar-produk/${base}-${idx + 1}.${extFromUrl(url)}`,
      });
    });
  });
  if (setting?.logo_image_url) {
    jobs.push({
      url: setting.logo_image_url,
      path: `logo-toko.${extFromUrl(setting.logo_image_url)}`,
    });
  }
  if (setting?.qris_image_url) {
    jobs.push({
      url: setting.qris_image_url,
      path: `qris-pembayaran.${extFromUrl(setting.qris_image_url)}`,
    });
  }

  for (let i = 0; i < jobs.length; i++) {
    const job = jobs[i];
    report(`Mengunduh gambar (${i + 1}/${jobs.length})...`);
    const blob = await fetchImageBlob(job.url);
    if (blob) {
      zip.file(job.path, blob);
    } else {
      zip.file(
        `gambar-gagal-diunduh/${job.path.split("/").pop()}.txt`,
        `Gagal mengunduh gambar dari URL berikut, mungkin sudah tidak tersedia:\n${job.url}`,
      );
    }
  }

  // ── PDF invoice + resi per pesanan, dipisah folder reseller/public ──
  if (includeOrderPdfs) {
    for (let i = 0; i < orders.length; i++) {
      const order = orders[i];
      report(
        `Membuat PDF invoice & resi (${i + 1}/${orders.length}): ${order.po_number}...`,
      );
      const folder = order.customer_type === "RESELLER" ? "reseller" : "public";
      const baseName = safeName(order.po_number);

      try {
        const invoiceBlob = await buildInvoicePdf(
          order,
          setting,
          storeName,
          storeAddress,
        );
        zip.file(`invoice-resi/${folder}/${baseName}-invoice.pdf`, invoiceBlob);
      } catch (err) {
        console.error(`Gagal membuat invoice untuk ${order.po_number}`, err);
      }

      try {
        const receiptBlob = await buildReceiptPdf(
          order,
          setting,
          storeName,
          storeAddress,
        );
        zip.file(`invoice-resi/${folder}/${baseName}-resi.pdf`, receiptBlob);
      } catch (err) {
        console.error(`Gagal membuat resi untuk ${order.po_number}`, err);
      }
    }
  }

  report("Mengompres arsip ZIP...");
  const zipBlob: Blob = await zip.generateAsync(
    { type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } },
    (metadata) => {
      report(`Mengompres arsip ZIP... ${Math.round(metadata.percent)}%`);
    },
  );

  const tanggalFile = new Date().toISOString().slice(0, 10);
  const filename = `Arsip-PO-${slug}-${tanggalFile}.zip`;

  const url = URL.createObjectURL(zipBlob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);

  report("Selesai.");
}
