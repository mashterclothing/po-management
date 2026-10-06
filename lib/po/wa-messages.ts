// lib/po/wa-messages.ts
// Helper untuk membentuk teks pesan WhatsApp & link wa.me
// Dipakai di halaman pendaftaran publik (user -> admin)
// dan di admin panel (admin -> reseller saat konfirmasi)

import { BRAND_NAME } from "@/lib/brand";
import { POResellerFull, POOrder } from '@/types/po';
import { formatRupiah } from '@/lib/po/pricing';

/**
 * Normalisasi nomor WA ke format 62xxx (tanpa +, tanpa 0 di depan)
 * supaya link wa.me selalu valid.
 */
export function normalizeWaNumber(raw: string): string {
  let num = raw.replace(/[^0-9]/g, '');
  if (num.startsWith('0')) {
    num = '62' + num.slice(1);
  } else if (!num.startsWith('62')) {
    num = '62' + num;
  }
  return num;
}

export function buildWaLink(phone: string, message: string): string {
  const num = normalizeWaNumber(phone);
  return `https://wa.me/${num}?text=${encodeURIComponent(message)}`;
}

/**
 * Pesan dari calon reseller -> admin
 */
export function buildRegistrationMessage(data: {
  nama: string;
  panggilan: string;
  whatsapp: string;
  alamat: string;
  pin: string;
}): string {
  return `*PENDAFTARAN RESELLER BARU*

Assalamu'alaikum Admin ${BRAND_NAME},
Saya ingin mengajukan diri sebagai reseller dengan data berikut:

> *Nama:* ${data.nama}
> *Username:* ${data.panggilan}
> *WhatsApp:* ${data.whatsapp}
> *Alamat:* ${data.alamat}
> *PIN:* ${data.pin}

Mohon bantuannya untuk proses aktivasi akun. Terima kasih.
_Wassalamu'alaikum._`;
}

/**
 * Pesan dari admin -> reseller
 */
export function buildConfirmationMessage(
  reseller: POResellerFull,
  portalUrl: string
): string {
  return `*KONFIRMASI PENDAFTARAN RESELLER*

Wa'alaikumussalam Wr. Wb.
Selamat! Pendaftaran Anda telah kami setujui. Sekarang Anda sudah bisa mengakses portal reseller di:

🔗 ${portalUrl}

*Detail Akun Anda:*
> Username: ${reseller.kode}
> PIN: ${reseller.pin_hash}

> *Penting:* Mohon pelajari dan patuhi syarat & ketentuan yang berlaku demi kenyamanan bersama.

Terima kasih,
*${BRAND_NAME}*`;
}

/**
 * Isi syarat & ketentuan, dipakai di modal S&K pada form pendaftaran.
 * ⚠️ SESUAIKAN isi (angka minimal order, fee, biaya admin) dengan aturan toko Anda.
 */
export const SYARAT_DAN_KETENTUAN = [
  'Minimal order adalah 12, dibawah itu belum bisa di anggap sebagai Reseller',
  'Jika sudah memenuhi target yang di tentukan, Reseller akan mendapatkan fee sebesar 10.000 per pcs',
  'Tidak diperkenankan untuk menjual dengan harga lebih tinggi atau lebih rendah dari harga tertera',
  'Segala pengiriman dan packing ditanggung oleh reseller',
  `Apabila dikehendaki pengiriman dan packing dari distributor (${BRAND_NAME}), maka akan dikenai admin pengiriman dan packing sebesar 5.000`,
  'Dilarang meredesign ulang poster yang sudah diberikan dengan desain sendiri',
];

/**
 * Label status pembayaran untuk ditampilkan di pesan WA.
 * Sengaja didefinisikan di sini (bukan import dari komponen) supaya
 * file ini tidak bergantung ke UI/komponen React.
 */
const PAYMENT_STATUS_LABEL: Record<string, string> = {
  BELUM_BAYAR: 'Belum Bayar',
  DP: 'DP',
  LUNAS: 'Lunas',
};
 
/**
 * Pesan konfirmasi rincian pesanan dari admin -> customer/reseller.
 * Dipakai saat admin klik "Hubungi via WhatsApp" di detail pesanan,
 * untuk memastikan rincian pesanan sudah sesuai dengan keinginan customer.
 */
export function buildOrderConfirmationMessage(order: POOrder): string {
  const daftarBarang = order.order_items
    .map(
      (item, i) =>
        `${i + 1}. ${item.product_name} (${item.ukuran}, ${item.lengan}, ${item.warna})\n    ${item.qty}pcs x ${formatRupiah(item.harga_satuan)} = ${formatRupiah(item.subtotal)}`
    )
    .join('\n');
 
  const statusLabel = PAYMENT_STATUS_LABEL[order.payment_status] ?? order.payment_status;
  let infoStatus = `*Status Pembayaran:* ${statusLabel}`;
  if (order.payment_status === 'DP') {
    const sisa = Math.max(0, order.total_amount - (order.paid_amount || 0));
    infoStatus += `\n*Sudah Dibayar:* ${formatRupiah(order.paid_amount || 0)}\n*Sisa Tagihan:* ${formatRupiah(sisa)}`;
  }
 
  let infoPengiriman = `*Metode Pengambilan:* ${order.delivery_method}`;
  if (order.delivery_method === 'Dikirim' && order.shipping_address) {
    infoPengiriman += `\n*Alamat Pengiriman:* ${order.shipping_address}`;
  }
 
  return `Halo ${order.customer_name}, kami ingin mengonfirmasi pesanan PO Anda.
 
*Kode PO:* ${order.po_number}
${infoPengiriman}
 
*Daftar Pesanan:*
${daftarBarang}
*Total Tagihan:* *${formatRupiah(order.total_amount)}*
 
${infoStatus}
 
Mohon konfirmasi apakah rincian pesanan di atas sudah sesuai. Terima kasih.`;
}