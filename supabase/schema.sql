-- =====================================================================
--  PO Management — skema database Supabase
-- =====================================================================
--  Cara pakai: Supabase Dashboard → SQL Editor → New query → tempel
--  seluruh isi file ini → Run.  Aman dijalankan ulang.
--
--  Skema yang dipakai: `public` (default). Jika ingin skema lain, ganti
--  semua "public." di file ini + set NEXT_PUBLIC_DB_SCHEMA di .env, lalu
--  tambahkan skema itu di Settings → API → "Exposed schemas".
--
--  ⚠️ File ini DISUSUN ULANG dari cara kode aplikasi memakai database
--  (tabel, kolom, fungsi). Kalau Anda punya skema asli dari aplikasi
--  sumber, bandingkan dulu dengan file ini.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. TABEL
-- ---------------------------------------------------------------------

-- Daftar user yang BOLEH mengelola PO (admin). Diisi manual — lihat README.
create table if not exists public.po_admins (
  id         uuid primary key references auth.users(id) on delete cascade,
  name       text,
  created_at timestamptz not null default now()
);

-- Satu baris = satu event/campaign PO.
create table if not exists public.po_setting (
  id                    uuid primary key default gen_random_uuid(),
  penyelenggara_po      text,
  title                 text,
  url_slug              text unique,
  bank_account_info     text,
  wa_admin_phone        text,
  sleeve_surcharge      numeric not null default 0,
  xxl_surcharge         numeric not null default 0,
  sweater_xxl_surcharge numeric not null default 0,
  is_active             boolean not null default false,
  periode_mulai         date,
  periode_selesai       date,
  qris_image_url        text,
  logo_image_url        text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- Katalog produk per PO.
create table if not exists public.po_products (
  id                           uuid primary key default gen_random_uuid(),
  po_setting_id                uuid references public.po_setting(id) on delete cascade,
  product_code                 text,
  name                         text not null,
  category                     text,                       -- 'dewasa' | 'kids'
  garment_type                 text,                       -- 'kaos_dewasa' | 'kaos_kids' | 'sweater' | 'hoodie'
  base_price                   numeric not null default 0,
  available_sizes              text[] not null default '{}',
  sleeve_types                 text[] not null default '{}',
  colors                       text[] not null default '{}',
  image_urls                   text[] not null default '{}',
  description                  text,
  is_active                    boolean not null default true,
  sort_order                   integer not null default 0,
  enable_sleeve_surcharge      boolean not null default false,
  enable_xxl_surcharge         boolean not null default false,
  enable_sweater_xxl_surcharge boolean not null default false,
  created_at                   timestamptz not null default now(),
  updated_at                   timestamptz not null default now()
);
create index if not exists po_products_setting_idx on public.po_products(po_setting_id);

-- Reseller (data global, dipakai lintas PO).
-- ⚠️ Kolom `pin_hash` menyimpan PIN apa adanya (bukan hash) — sama seperti aplikasi
--    sumber, karena admin perlu melihat PIN untuk dikirim ke reseller.
create table if not exists public.po_resellers (
  id         uuid primary key default gen_random_uuid(),
  kode       text not null,
  pin_hash   text not null,
  nama       text not null,
  whatsapp   text,
  kota       text,
  alamat     text,
  is_active  boolean not null default true,
  status     text not null default 'confirmed' check (status in ('pending','confirmed')),
  created_at timestamptz not null default now()
);
-- Kode reseller unik tanpa membedakan huruf besar/kecil (login memakai UPPERCASE).
create unique index if not exists po_resellers_kode_uidx on public.po_resellers (upper(kode));

-- Pesanan.
create table if not exists public.po_orders (
  id                 uuid primary key default gen_random_uuid(),
  po_setting_id      uuid references public.po_setting(id) on delete cascade,
  po_number          text not null,
  customer_type      text not null check (customer_type in ('PUBLIC','RESELLER')),
  reseller_id        uuid references public.po_resellers(id) on delete set null,
  customer_name      text not null,
  customer_wa        text not null,
  delivery_method    text not null check (delivery_method in ('Diambil','Dikirim')),
  shipping_address   text,
  order_items        jsonb not null default '[]'::jsonb,
  notes              text,
  total_amount       numeric not null default 0,
  payment_status     text not null default 'BELUM_BAYAR' check (payment_status in ('BELUM_BAYAR','DP','LUNAS')),
  paid_amount        numeric not null default 0,
  payment_updated_at timestamptz,
  created_at         timestamptz not null default now()
);
create index if not exists po_orders_setting_idx  on public.po_orders(po_setting_id);
create index if not exists po_orders_reseller_idx on public.po_orders(reseller_id);
create index if not exists po_orders_number_idx   on public.po_orders(po_number);

-- Penghitung nomor PO per hari (dipakai generate_po_number).
create table if not exists public.po_counters (
  day        date primary key,
  last_value integer not null default 0
);

-- Otomatis isi updated_at saat baris diubah.
create or replace function public.po_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists po_setting_touch  on public.po_setting;
create trigger po_setting_touch  before update on public.po_setting
  for each row execute function public.po_touch_updated_at();

drop trigger if exists po_products_touch on public.po_products;
create trigger po_products_touch before update on public.po_products
  for each row execute function public.po_touch_updated_at();


-- ---------------------------------------------------------------------
-- 2. FUNGSI (RPC)
-- ---------------------------------------------------------------------

-- Apakah user yang sedang login adalah admin PO?
create or replace function public.is_po_admin()
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.po_admins where id = auth.uid());
$$;

-- Nomor PO berurutan per hari: PO-YYMMDD-0001 (umum) / POR-YYMMDD-0001 (reseller).
create or replace function public.generate_po_number(p_type text default 'PUBLIC')
returns text
language plpgsql security definer set search_path = public as $$
declare
  v_day    date := (now() at time zone 'Asia/Jakarta')::date;
  v_n      integer;
  v_prefix text := case when upper(coalesce(p_type,'')) = 'RESELLER' then 'POR' else 'PO' end;
begin
  insert into public.po_counters (day, last_value) values (v_day, 1)
  on conflict (day) do update set last_value = public.po_counters.last_value + 1
  returning last_value into v_n;

  return v_prefix || '-' || to_char(v_day, 'YYMMDD') || '-' || lpad(v_n::text, 4, '0');
end $$;

-- Login reseller (kode + PIN). Dipanggil dari halaman publik /po/reseller.
create or replace function public.login_reseller(p_kode text, p_pin text)
returns json
language plpgsql security definer set search_path = public as $$
declare
  r public.po_resellers;
begin
  select * into r from public.po_resellers
  where upper(kode) = upper(trim(coalesce(p_kode,'')))
  limit 1;

  if not found or r.pin_hash is distinct from trim(coalesce(p_pin,'')) then
    return json_build_object('sukses', false, 'pesan', 'Username atau PIN salah.');
  end if;

  if r.status <> 'confirmed' or not r.is_active then
    return json_build_object('sukses', false, 'pesan', 'Akun Anda belum aktif. Tunggu konfirmasi dari admin.');
  end if;

  return json_build_object(
    'sukses', true,
    'reseller', json_build_object(
      'id', r.id, 'kode', r.kode, 'nama', r.nama, 'wa', r.whatsapp, 'kota', r.kota
    )
  );
end $$;

-- Riwayat pesanan milik satu reseller (tanpa membuka akses baca ke tabel po_orders).
create or replace function public.get_reseller_orders(
  p_reseller_id   uuid,
  p_po_setting_id uuid default null
)
returns table (
  id              uuid,
  po_number       text,
  created_at      timestamptz,
  total_amount    numeric,
  order_items     jsonb,
  notes           text,
  delivery_method text
)
language sql stable security definer set search_path = public as $$
  select o.id, o.po_number, o.created_at, o.total_amount, o.order_items, o.notes, o.delivery_method
  from public.po_orders o
  where o.reseller_id = p_reseller_id
    and (p_po_setting_id is null or o.po_setting_id = p_po_setting_id)
  order by o.created_at desc;
$$;

-- Hanya fungsi yang memang untuk publik yang boleh dipanggil anonim.
revoke all on function public.is_po_admin()                       from public, anon;
revoke all on function public.generate_po_number(text)            from public;
revoke all on function public.login_reseller(text, text)          from public;
revoke all on function public.get_reseller_orders(uuid, uuid)     from public;
grant execute on function public.is_po_admin()                    to authenticated;
grant execute on function public.generate_po_number(text)         to anon, authenticated;
grant execute on function public.login_reseller(text, text)       to anon, authenticated;
grant execute on function public.get_reseller_orders(uuid, uuid)  to anon, authenticated;


-- ---------------------------------------------------------------------
-- 3. ROW LEVEL SECURITY (siapa boleh apa)
-- ---------------------------------------------------------------------
--  anon (pengunjung)  : baca setting & produk, kirim pesanan, daftar reseller
--  admin (po_admins)  : semuanya
--  Data pelanggan (po_orders) & reseller (po_resellers) TIDAK bisa dibaca anon.

alter table public.po_admins    enable row level security;
alter table public.po_setting   enable row level security;
alter table public.po_products  enable row level security;
alter table public.po_resellers enable row level security;
alter table public.po_orders    enable row level security;
alter table public.po_counters  enable row level security;   -- tanpa policy = tertutup

-- Hak tabel (RLS tetap berlaku di atasnya)
revoke all on public.po_admins, public.po_setting, public.po_products,
              public.po_resellers, public.po_orders, public.po_counters from anon;
revoke all on public.po_counters from authenticated;
grant select                         on public.po_setting, public.po_products to anon;
grant insert                         on public.po_orders, public.po_resellers to anon;
grant select, insert, update, delete on public.po_admins, public.po_setting, public.po_products,
                                        public.po_resellers, public.po_orders to authenticated;

-- po_admins: user hanya boleh melihat barisnya sendiri
drop policy if exists po_admins_self_read on public.po_admins;
create policy po_admins_self_read on public.po_admins
  for select to authenticated using (id = auth.uid());

-- po_setting
drop policy if exists po_setting_public_read on public.po_setting;
create policy po_setting_public_read on public.po_setting
  for select to anon, authenticated using (true);
drop policy if exists po_setting_admin_all on public.po_setting;
create policy po_setting_admin_all on public.po_setting
  for all to authenticated using (public.is_po_admin()) with check (public.is_po_admin());

-- po_products
drop policy if exists po_products_public_read on public.po_products;
create policy po_products_public_read on public.po_products
  for select to anon, authenticated using (true);
drop policy if exists po_products_admin_all on public.po_products;
create policy po_products_admin_all on public.po_products
  for all to authenticated using (public.is_po_admin()) with check (public.is_po_admin());

-- po_resellers: pengunjung hanya boleh MENDAFTAR (status pending, belum aktif)
drop policy if exists po_resellers_public_register on public.po_resellers;
create policy po_resellers_public_register on public.po_resellers
  for insert to anon, authenticated
  with check (status = 'pending' and is_active = false);
drop policy if exists po_resellers_admin_all on public.po_resellers;
create policy po_resellers_admin_all on public.po_resellers
  for all to authenticated using (public.is_po_admin()) with check (public.is_po_admin());

-- po_orders: pengunjung hanya boleh MENGIRIM pesanan baru (belum bayar)
drop policy if exists po_orders_public_insert on public.po_orders;
create policy po_orders_public_insert on public.po_orders
  for insert to anon, authenticated
  with check (payment_status = 'BELUM_BAYAR' and paid_amount = 0);
drop policy if exists po_orders_admin_all on public.po_orders;
create policy po_orders_admin_all on public.po_orders
  for all to authenticated using (public.is_po_admin()) with check (public.is_po_admin());


-- ---------------------------------------------------------------------
-- 4. STORAGE — bucket foto produk, logo, QRIS
-- ---------------------------------------------------------------------
-- Bucket publik: gambar bisa dilihat lewat URL tanpa login.
-- Hanya admin yang boleh upload / ubah / hapus.

insert into storage.buckets (id, name, public)
values ('po_assets', 'po_assets', true)
on conflict (id) do update set public = true;

drop policy if exists po_assets_admin_select on storage.objects;
create policy po_assets_admin_select on storage.objects
  for select to authenticated
  using (bucket_id = 'po_assets' and public.is_po_admin());

drop policy if exists po_assets_admin_insert on storage.objects;
create policy po_assets_admin_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'po_assets' and public.is_po_admin());

drop policy if exists po_assets_admin_update on storage.objects;
create policy po_assets_admin_update on storage.objects
  for update to authenticated
  using (bucket_id = 'po_assets' and public.is_po_admin())
  with check (bucket_id = 'po_assets' and public.is_po_admin());

drop policy if exists po_assets_admin_delete on storage.objects;
create policy po_assets_admin_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'po_assets' and public.is_po_admin());


-- ---------------------------------------------------------------------
-- 5. ADMIN PERTAMA  (jalankan SETELAH membuat user di Authentication → Users)
-- ---------------------------------------------------------------------
-- insert into public.po_admins (id, name)
-- select id, 'Nama Admin' from auth.users where email = 'email-admin@contoh.com';
