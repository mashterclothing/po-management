// lib/po/supabase.ts
// Semua query Supabase untuk fitur PO dikumpulkan di sini

import { createClient } from '@/lib/supabase/client';
import { POSetting, POProduct, POOrderPayload } from '@/types/po';
import { calculateItemPrice } from './pricing';

/**
 * Ambil setting PO aktif
 */
export async function getPOSetting(): Promise<POSetting | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('po_setting')
    .select('*')
    .single();

  if (error) return null;
  return data;
}

export async function getPOSettingBySlug(slug: string): Promise<POSetting | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('po_setting')
    .select('*')
    .eq('url_slug', slug)
    .single();
  if (error) return null;
  return data;
}

/**
 * Ambil semua produk aktif, diurutkan by sort_order
 */
export async function getPOProducts(poSettingId?: string): Promise<POProduct[]> {
  const supabase = createClient();
  let query = supabase.from('po_products').select('*').eq('is_active', true);

  if (poSettingId) {
    query = query.eq('po_setting_id', poSettingId);
  }

  const { data, error } = await query.order('sort_order', { ascending: true });
  if (error) return [];
  return data;
}

/**
 * Login reseller via Supabase RPC
 */
export async function loginReseller(kode: string, pin: string) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('login_reseller', {
    p_kode: kode,
    p_pin: pin,
  });

  if (error) return { sukses: false, pesan: 'Terjadi kesalahan server.' };
  return data;
}

/**
 * Ambil semua pesanan milik reseller tertentu, diurutkan dari terbaru
 */
export async function getResellerOrders(
  resellerId: string,
  poSettingId?: string,
): Promise<POResellerOrder[]> {
  const supabase = createClient();
  // Lewat fungsi database (SECURITY DEFINER) supaya pengunjung publik tidak
  // perlu hak SELECT ke tabel po_orders (isinya nama, WA, alamat pelanggan).
  const { data, error } = await supabase.rpc('get_reseller_orders', {
    p_reseller_id: resellerId,
    p_po_setting_id: poSettingId ?? null,
  });
  if (error) return [];
  return (data ?? []) as POResellerOrder[];
}

export interface POResellerOrder {
  id: string; // ✅ TAMBAH field ini
  po_number: string;
  created_at: string;
  total_amount: number;
  order_items: Array<{
    product_name: string;
    warna: string;
    lengan: string;
    ukuran: string;
    qty: number;
    harga_satuan: number;
    subtotal: number;
  }>;
  notes?: string;
  delivery_method?: string;
}

/**
 * Submit pesanan ke database.
 * Harga DIHITUNG ULANG di sini berdasarkan data DB, bukan dari client.
 */
export async function submitOrder(
  payload: POOrderPayload,
  setting: POSetting,
  products: POProduct[]
): Promise<{ success: boolean; po_number?: string; error?: string }> {
  const supabase = createClient();

  // Hitung ulang total (validasi harga dari server)
  const pricingSettings = {
    sleeveSurcharge: setting.sleeve_surcharge ?? 0,
    xxlSurcharge: setting.xxl_surcharge ?? 0,
    sweaterXxlSurcharge: setting.sweater_xxl_surcharge ?? 0,
  };

  let totalAmount = 0;
  const validatedItems = payload.order_items.map((item) => {
    const product = products.find((p) => p.id === item.product_id);
    const basePrice = product ? product.base_price : 0;

    const hargaSatuan = calculateItemPrice(
      basePrice,
      item.ukuran,
      item.lengan,
      product || {},
      pricingSettings
    );

    const subtotal = hargaSatuan * item.qty;
    totalAmount += subtotal;

    return { ...item, harga_satuan: hargaSatuan, subtotal };
  });

  // Generate nomor PO
  const { data: poNumber } = await supabase.rpc('generate_po_number', {
    p_type: payload.customer_type,
  });

  // Insert pesanan
  const { error } = await supabase.from('po_orders').insert({
  po_number:        poNumber,
  customer_type:    payload.customer_type,
  reseller_id:      payload.reseller_id ?? null,
  customer_name:    payload.customer_name,
  customer_wa:      payload.customer_wa,
  delivery_method:  payload.delivery_method,
  shipping_address: payload.shipping_address ?? null,
  order_items:      validatedItems,
  notes:            payload.notes ?? null,
  total_amount:     totalAmount,
  po_setting_id:    setting.id,   // ← WAJIB ditambahkan
});

  if (error) return { success: false, error: error.message };
  return { success: true, po_number: poNumber };
}

// 1. Fungsi Hapus Order
// ✅ Fix: hapus kondisi if, langsung delete berdasarkan po_number
// Hapus DELETE & UPDATE ke Supabase langsung, ganti ke API route

export async function deleteResellerOrder(poNumber: string, resellerId: string) {
  const res = await fetch(
    `/api/po/orders?po_number=${encodeURIComponent(poNumber)}&reseller_id=${encodeURIComponent(resellerId)}`,
    { method: 'DELETE' }
  );
  const json = await res.json();
  if (!res.ok) return { success: false, error: json.error };
  return { success: true };
}

export async function updateResellerOrder(
  poNumber: string,
  payload: any,
  setting: POSetting,
  products: POProduct[]
): Promise<{ success: boolean; error?: string }> {
  const total_amount = payload.order_items.reduce(
    (sum: number, item: any) => sum + item.subtotal, 0
  );

  const res = await fetch('/api/po/orders', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      po_number: poNumber,
      reseller_id: payload.reseller_id,
      notes: payload.notes,
      order_items: payload.order_items,
      total_amount,
    }),
  });

  const json = await res.json();
  if (!res.ok) return { success: false, error: json.error };
  return { success: true };
}