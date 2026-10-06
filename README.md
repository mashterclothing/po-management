# PO Management

Aplikasi pengelolaan **Pre-Order (PO)** — dipisahkan dari LCO SuperApp (Monitoring Produksi Sablon) supaya bisa dipakai usaha lain tanpa modul produksi, keuangan, gaji, dsb.

## Isi aplikasi

**Panel admin** (butuh login) — halaman `/`
- Daftar PO, buat PO baru, buka satu PO (`/?poId=...`)
- Tab per PO: Overview, Pesanan, Produk, Reseller, Pengemasan, Pengiriman, Rekap, Pengaturan
- Cetak invoice & resi A6, export Excel, arsip ZIP, hapus PO

**Halaman publik** (tanpa login)
- `/po/<slug>` — katalog PO + form pesan
- `/po/<slug>/daftar-reseller` — pendaftaran reseller (menunggu konfirmasi admin)
- `/po/reseller` → `/po/reseller/portal` — portal reseller (login kode + PIN, input/ubah/hapus pesanan)

## Cara memasang

### 1. Buat project Supabase
Daftar di [supabase.com](https://supabase.com) → New project. Simpan **Project URL**, **anon key**, dan **service_role key** (Project Settings → API).

### 2. Buat tabel & aturan keamanan
Supabase → **SQL Editor** → New query → tempel seluruh isi [`supabase/schema.sql`](supabase/schema.sql) → **Run**.

### 3. Isi `.env.local`
```bash
cp .env.example .env.local
```
Isi URL & key Supabase, `NEXT_PUBLIC_BRAND_NAME` (nama toko), dan `NEXT_PUBLIC_STORE_ADDRESS` (alamat di struk).

> `SUPABASE_SERVICE_ROLE_KEY` itu rahasia: jangan dibagikan, jangan di-commit ke Git.

### 4. Membuat akun admin
1. Supabase → **Authentication → Users → Add user** → isi email + password (centang *Auto Confirm User*).
2. Di **SQL Editor**, daftarkan user itu sebagai admin PO:
   ```sql
   insert into public.po_admins (id, name)
   select id, 'Nama Admin' from auth.users where email = 'email-admin@contoh.com';
   ```
User yang login tetapi belum ada di `po_admins` **tidak bisa** membaca/mengubah data apa pun (dijaga oleh RLS di database, bukan hanya tampilan).

### 5. Jalankan
```bash
npm install
npm run dev      # http://localhost:3000
```

### 6. Mulai pakai
Login → **Buat PO baru** (judul + slug, mis. `kaos-vol-1`) → tab **Produk** & **Pengaturan** (rekening, WA admin, QRIS, biaya tambahan) → aktifkan PO → bagikan `https://domain-anda/po/kaos-vol-1`.

## Deploy
- **Vercel**: import repo, isi semua variabel dari `.env.example` di Environment Variables.
- **Docker / Coolify**: ada `Dockerfile`. Variabel `NEXT_PUBLIC_*` harus diberikan sebagai *build argument* karena ikut "ditanam" saat build.

## Yang WAJIB disesuaikan
- **Syarat & Ketentuan reseller** → `lib/po/wa-messages.ts` (`SYARAT_DAN_KETENTUAN`): angka minimal order 12, fee 10.000/pcs, biaya admin 5.000 masih bawaan toko asal.
- **Isi pesan WhatsApp** → file yang sama.
- **Logo/ikon** → ganti `app/favicon.ico`.

## Perbedaan dari aplikasi asal
| Hal | Aplikasi asal | Versi ini |
|---|---|---|
| Login & hak akses | Tabel `users` + role/permission, banyak modul | Supabase Auth + tabel `po_admins` (admin = boleh semua di PO) |
| Nama toko, alamat | Tertulis di kode | Dari `.env` |
| Skema database | `monitoring_sablon` (tetap) | `public` (bisa diubah lewat `NEXT_PUBLIC_DB_SCHEMA`) |
| Nomor PO pesanan umum | Acak `PO-YYMMDD-xxxx` (bisa kembar) | Berurutan dari database (`generate_po_number`), acak hanya sebagai cadangan |
| Pesanan publik/reseller | Anon bisa **membaca** tabel pesanan | Anon hanya bisa **menambah** pesanan; reseller membaca riwayatnya lewat fungsi `get_reseller_orders` |
| Notifikasi push, Google Sheets, TV, tracking, gaji, dll | Ada | Tidak ikut dibawa |

## Catatan penting / keterbatasan
- **Belum diuji jalan.** Lingkungan tempat file ini dibuat tidak punya akses internet, jadi `npm install`, `npm run build`, dan koneksi ke Supabase belum bisa dicoba. Yang sudah dicek: sintaks seluruh file, semua `import` menunjuk ke file yang ada, dan semua paket yang dipakai sudah ada di `package.json`. Jalankan `npm install && npm run build` dulu dan coba alur lengkap (buat PO → tambah produk → pesan dari halaman publik → lihat di admin → login reseller).
- **`supabase/schema.sql` disusun ulang** dari cara kode memakai database, bukan disalin dari database asli. Jika ada kolom/fitur yang error "column ... does not exist", bandingkan dengan skema asli dan sesuaikan.
- **PIN reseller disimpan apa adanya** di kolom `pin_hash` (sama seperti aplikasi asal, supaya admin bisa melihat & mengirim PIN). Anjurkan reseller memakai PIN yang tidak dipakai di tempat lain. Fungsi `login_reseller` juga belum membatasi percobaan salah berulang.
- **`/api/po/orders`** (ubah/hapus pesanan reseller) memakai service role dan belum memverifikasi PIN; yang melindungi hanyalah ID reseller yang tidak bisa dibaca publik. Untuk keamanan lebih, tambahkan verifikasi sesi/PIN di route itu.
- Data dari aplikasi asal **tidak ikut** — database ini mulai kosong.

## Lisensi
Apache-2.0 (lihat `LICENSE` dan `NOTICE`). Berasal dari proyek *monitoring-produksi-sablon* oleh abdllahmajid.
