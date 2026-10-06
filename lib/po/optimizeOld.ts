// lib/po/optimizeOld.ts
//
// Optimasi foto LAMA di katalog PO (sekali jalan, dipicu admin dari browser).
// Per foto: unduh → kompres → upload versi utama + thumbnail → ganti URL di produk
// → baru hapus file lama. File lama hanya dihapus kalau DB berhasil di-update.

import { createClient } from '@/lib/supabase/client';
import { POProduct } from '@/types/po';
import { updatePOProduct, deleteProductImages } from './admin';
import { uploadOptimized } from './optimizeImage';

export const isOptimized = (url: string) => url.endsWith('-opt.jpg');

export function countOldImages(products: POProduct[]): number {
  return products.reduce(
    (n, p) => n + (p.image_urls || []).filter((u) => !isOptimized(u)).length,
    0,
  );
}

export interface OptimizeReport {
  done: number;
  failed: number;
  savedBytes: number;
}

export async function optimizeExistingImages(
  products: POProduct[],
  onProgress: (done: number, total: number) => void,
): Promise<OptimizeReport> {
  const supabase = createClient();
  const total = countOldImages(products);
  const report: OptimizeReport = { done: 0, failed: 0, savedBytes: 0 };
  let processed = 0;

  for (const p of products) {
    const urls = p.image_urls || [];
    if (!urls.some((u) => !isOptimized(u))) continue;

    const newUrls: string[] = [];
    const replacedOld: string[] = [];

    for (const url of urls) {
      if (isOptimized(url)) {
        newUrls.push(url);
        continue;
      }
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const blob = await res.blob();
        const up = await uploadOptimized(supabase, blob);
        if (!up) throw new Error('upload gagal');
        newUrls.push(up.url);
        replacedOld.push(url);
        report.done += 1;
        report.savedBytes += Math.max(0, blob.size - up.bytes);
      } catch (e) {
        console.warn('Lewati foto (tetap pakai yang lama):', url, e);
        newUrls.push(url);
        report.failed += 1;
      }
      processed += 1;
      onProgress(processed, total);
    }

    if (replacedOld.length > 0) {
      const r = await updatePOProduct(p.id, { image_urls: newUrls });
      if (r.success) {
        await deleteProductImages(replacedOld);
      } else {
        // DB gagal → file lama dipertahankan, hitung sebagai gagal
        report.failed += replacedOld.length;
        report.done -= replacedOld.length;
      }
    }
  }
  return report;
}