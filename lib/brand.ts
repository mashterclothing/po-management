// lib/brand.ts
//
// Identitas toko — diatur lewat .env supaya tidak perlu mengubah kode.
//   NEXT_PUBLIC_BRAND_NAME    : nama toko (tampil di struk, footer, pesan WA)
//   NEXT_PUBLIC_STORE_ADDRESS : alamat toko (tampil di struk/slip cetak; boleh kosong)

export const BRAND_NAME =
  process.env.NEXT_PUBLIC_BRAND_NAME || "Nama Toko Anda";

export const STORE_ADDRESS = process.env.NEXT_PUBLIC_STORE_ADDRESS || "";
