// lib/po/pricing.ts
import { POProduct } from "@/types/po";

export interface PricingSettings {
  sleeveSurcharge: number;
  xxlSurcharge: number;
  sweaterXxlSurcharge: number; 
}

/**
 * Hitung harga satuan berdasarkan varian dan aturan produk.
 */
export function calculateItemPrice(
  basePrice: number,
  size: string,
  sleeveType: string,
  product: POProduct | { enable_sleeve_surcharge?: boolean; enable_xxl_surcharge?: boolean;enable_sweater_xxl_surcharge?: boolean; }, 
  settings: PricingSettings
): number {
  let additionalSleeve = 0;
  let additionalSize = 0;

  // Tambahan lengan panjang (jika diaktifkan di produk)
  if (product.enable_sleeve_surcharge && sleeveType.toLowerCase().includes('panjang')) {
    additionalSleeve = settings.sleeveSurcharge;
  }

// Tambahan ukuran XXL+ (jika diaktifkan di produk)
if (product.enable_xxl_surcharge) {
  const upperSize = size.toUpperCase();
  if (upperSize.includes('L') && upperSize !== 'L' && upperSize !== 'XL') {
    const match2 = upperSize.match(/^(\d+)XL$/);
    if (match2) {
      const num = parseInt(match2[1], 10);
      if (num >= 2) additionalSize = settings.xxlSurcharge * (num - 1);
    } else {
      const xCount = (upperSize.match(/X/g) || []).length;
      if (xCount >= 2) additionalSize = settings.xxlSurcharge * (xCount - 1);
    }
  }
}

// ↓ TAMBAHKAN INI — Tambahan sweater size 2XL+ (berlipat tiap tingkat)
if (product.enable_sweater_xxl_surcharge) {
  const upperSize = size.toUpperCase();
  if (upperSize.includes('L') && upperSize !== 'L' && upperSize !== 'XL') {
    const match2 = upperSize.match(/^(\d+)XL$/);
    if (match2) {
      const num = parseInt(match2[1], 10);
      if (num >= 2) additionalSize += settings.sweaterXxlSurcharge * (num - 1);
    } else {
      const xCount = (upperSize.match(/X/g) || []).length;
      if (xCount >= 2) additionalSize += settings.sweaterXxlSurcharge * (xCount - 1);
    }
  }
}

  return basePrice + additionalSleeve + additionalSize;
}

/**
 * Format angka ke Rupiah Indonesia
 */
export function formatRupiah(amount: number): string {
  return 'Rp ' + amount.toLocaleString('id-ID');
}