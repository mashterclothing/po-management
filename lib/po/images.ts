// lib/po/images.ts
//
// Helper optimasi gambar katalog PO.
//
// Setiap foto produk baru diupload dalam 2 versi:
//   products/<nama>-opt.jpg        → versi utama (maks 1400px, ±200-350 KB)
//   products/<nama>-opt-thumb.jpg  → thumbnail kartu katalog (maks 480px, ±20-50 KB)
//
// URL yang disimpan di DB (image_urls) tetap versi utama. Thumbnail diturunkan
// dari nama file. Foto lama (tanpa akhiran "-opt") tidak punya thumbnail,
// jadi otomatis tetap memakai file aslinya.

import type { SyntheticEvent } from 'react';

const MAIN_SUFFIX = '-opt.jpg';
const THUMB_SUFFIX = '-opt-thumb.jpg';

/** URL thumbnail untuk foto yang sudah dioptimasi; foto lama dikembalikan apa adanya. */
export function thumbUrl(url: string): string {
  if (!url) return url;
  return url.endsWith(MAIN_SUFFIX)
    ? url.slice(0, -MAIN_SUFFIX.length) + THUMB_SUFFIX
    : url;
}

/** Path storage thumbnail dari path versi utama (null jika foto lama). */
export function thumbPath(path: string): string | null {
  return path.endsWith(MAIN_SUFFIX)
    ? path.slice(0, -MAIN_SUFFIX.length) + THUMB_SUFFIX
    : null;
}

/** Handler onError: kalau thumbnail gagal dimuat, pakai gambar aslinya (sekali saja). */
export function fallbackToOriginal(original: string) {
  return (e: SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (img.dataset.fallback === '1') return;
    img.dataset.fallback = '1';
    img.src = original;
  };
}

/** Nama dasar file baru + akhiran, mis. "products/1730000000-ab12cd-opt.jpg". */
export function newImagePaths(): { main: string; thumb: string } {
  const base = `products/${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return { main: base + MAIN_SUFFIX, thumb: base + THUMB_SUFFIX };
}