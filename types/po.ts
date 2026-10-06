// types/po.ts

export interface POSetting {
  id: string;
  penyelenggara_po: string;
  title?: string;
  bank_account_info?: string;
  wa_admin_phone: string;
  sleeve_surcharge: number;
  xxl_surcharge: number;
  sweater_xxl_surcharge: number;   // ← pastikan ini ADA (bukan optional)
  is_active: boolean;
  periode_mulai?: string;
  periode_selesai?: string;
  created_at?: string;
  updated_at?: string;
  url_slug?: string;
  qris_image_url?: string | null;
  logo_image_url?: string | null;
}

export type POProductCategory = 'dewasa' | 'kids';

export type POGarmentType = 'kaos_dewasa' | 'kaos_kids' | 'sweater' | 'hoodie';

export interface POProduct {
  id: string;
  product_code: string;
  name: string;
  category: POProductCategory;
  garment_type: POGarmentType;
  base_price: number;
  available_sizes: string[];
  sleeve_types: string[];
  colors: string[];
  image_urls: string[];
  description?: string;
  is_active: boolean;
  sort_order: number;
  enable_sleeve_surcharge: boolean;        // ← hapus ? (non-optional)
  enable_xxl_surcharge: boolean;           // ← hapus ? (non-optional)
  enable_sweater_xxl_surcharge: boolean;   // ← hapus ? dan pastikan ada
  created_at?: string;
  updated_at?: string;
}

export interface POReseller {
  id: string;
  kode: string;
  nama: string;
  wa: string | null;
  kota: string | null;
}

export interface POOrderItem {
  product_id: string;
  product_name: string;
  warna: string;
  lengan: string;
  ukuran: string;
  qty: number;
  harga_satuan: number;
  subtotal: number;
  // Ditandai admin di tab Pengemasan saat stok fisik tidak mencukupi.
  // 0 = stok lengkap. >0 = kurang sekian pcs dari qty yang dipesan.
  // Optional supaya pesanan lama (sebelum fitur ini ada) tetap valid
  // tanpa migration data — kode selalu baca dengan fallback `|| 0`.
  shortage_qty?: number;
}

export interface POOrderPayload {
  customer_type: 'PUBLIC' | 'RESELLER';
  reseller_id?: string;
  customer_name: string;
  customer_wa: string;
  delivery_method: 'Diambil' | 'Dikirim';
  shipping_address?: string;
  order_items: POOrderItem[];
  notes?: string;
}

export interface CartItem extends POOrderItem {
  cart_id: string; // uuid lokal, bukan dari DB
}

// State keranjang untuk public form
export interface CartState {
  items: CartItem[];
}

// Tambahkan di bawah interface yang sudah ada di types/po.ts

export interface POOrder {
  id: string;
  po_number: string;
  customer_type: 'PUBLIC' | 'RESELLER';
  reseller_id: string | null;
  customer_name: string;
  customer_wa: string;
  delivery_method: 'Diambil' | 'Dikirim';
  shipping_address: string | null;
  order_items: POOrderItem[];
  notes: string | null;
  total_amount: number;
  created_at: string;
  // Join data
  po_resellers?: { nama: string; kode: string } | null;
}

export interface POResellerFull {
  id: string;
  kode: string;
  pin_hash: string;
  nama: string;
  whatsapp: string | null;
  kota: string | null;
  is_active: boolean;
  created_at: string;
  alamat: string | null;
  status: 'pending' | 'confirmed';
}

export interface POProductFull extends POProduct {
  // sudah lengkap di POProduct, alias ini untuk kejelasan di admin context
}

// ─── Tambahkan ke types/po.ts ───

export type PaymentStatus = 'BELUM_BAYAR' | 'DP' | 'LUNAS';

// Update interface POOrder yang sudah ada, tambahkan 3 field ini:
export interface POOrder {
  id: string;
  po_number: string;
  customer_type: 'PUBLIC' | 'RESELLER';
  reseller_id: string | null;
  customer_name: string;
  customer_wa: string;
  delivery_method: 'Diambil' | 'Dikirim';
  shipping_address: string | null;
  order_items: POOrderItem[];
  notes: string | null;
  total_amount: number;
  created_at: string;
  po_resellers?: { nama: string; kode: string } | null;
  // ── Field baru ──
  payment_status: PaymentStatus;
  paid_amount: number;
  payment_updated_at: string | null;
}