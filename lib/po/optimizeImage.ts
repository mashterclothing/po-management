// lib/po/optimizeImage.ts
//
// Kompres + upload foto produk PO (khusus browser/admin).
// Hasil: versi utama (maks 1200px) + thumbnail (maks 480px), keduanya JPEG.

import imageCompression from 'browser-image-compression';
import type { createClient } from '@/lib/supabase/client';
import { newImagePaths } from './images';

type Supa = ReturnType<typeof createClient>;
const BUCKET = 'po_assets';

/** Kompres 1 file jadi { main, thumb }. null jika gagal. */
export async function compressForCatalog(
  file: File | Blob,
): Promise<{ main: Blob; thumb: Blob } | null> {
  try {
    const f = file instanceof File ? file : new File([file], 'foto.jpg', { type: file.type || 'image/jpeg' });
    const main = await imageCompression(f, {
      maxSizeMB: 0.25,
      maxWidthOrHeight: 1200,
      useWebWorker: true,
      fileType: 'image/jpeg',
      initialQuality: 0.8,
    });
    const thumb = await imageCompression(f, {
      maxSizeMB: 0.05,
      maxWidthOrHeight: 480,
      useWebWorker: true,
      fileType: 'image/jpeg',
      initialQuality: 0.75,
    });
    return { main, thumb };
  } catch (e) {
    console.warn('Kompresi gagal:', e);
    return null;
  }
}

/**
 * Kompres lalu upload (utama + thumbnail). Mengembalikan public URL versi utama,
 * ukuran akhir (byte), atau null bila upload utama gagal.
 */
export async function uploadOptimized(
  supabase: Supa,
  file: File | Blob,
): Promise<{ url: string; bytes: number } | null> {
  const c = await compressForCatalog(file);
  if (!c) return null;

  const paths = newImagePaths();
  const opts = { cacheControl: '31536000', contentType: 'image/jpeg' };

  const { error } = await supabase.storage.from(BUCKET).upload(paths.main, c.main, opts);
  if (error) {
    console.error('Gagal upload gambar:', error);
    return null;
  }
  // Thumbnail gagal → tidak fatal, katalog otomatis pakai versi utama
  const { error: tErr } = await supabase.storage.from(BUCKET).upload(paths.thumb, c.thumb, opts);
  if (tErr) console.warn('Gagal upload thumbnail:', tErr);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(paths.main);
  return { url: data.publicUrl, bytes: c.main.size + (tErr ? 0 : c.thumb.size) };
}