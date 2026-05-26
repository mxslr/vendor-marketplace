<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

<p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>

---

# Vendor Marketplace — Backend API

RESTful API dan Sistem Database untuk platform marketplace penyedia jasa kampus (CSC × CCI). Dibangun menggunakan [NestJS](https://github.com/nestjs/nest), Prisma ORM, dan PostgreSQL (Supabase).

---

## Daftar Isi

1. [Cara Menjalankan Project](#1-cara-menjalankan-project)
2. [Akun Testing (Seed Data)](#2-akun-testing-seed-data)
3. [Base URL dan Format Request](#3-base-url-dan-format-request)
4. [Referensi Status Order](#4-referensi-status-order)
5. [Alur Testing Lengkap (Flow A–N)](#5-alur-testing-lengkap-flow-an)
6. [Testing Webhook Midtrans](#6-testing-webhook-midtrans)
7. [Referensi Endpoint Lengkap](#7-referensi-endpoint-lengkap)
8. [Troubleshooting Umum](#8-troubleshooting-umum)

---

## 1. Cara Menjalankan Project

### Prerequisites

- Node.js v18 atau lebih baru
- npm v9 atau lebih baru
- Akses ke project Supabase (koordinasi dengan tim teknis untuk mendapat kredensial)

### Clone & Install Dependencies

```bash
git clone <repo-url>
cd vendor-marketplace
npm install
```

### Setup Environment Variables

Salin `.env.example` menjadi `.env`, lalu isi setiap variabel:

```bash
cp .env.example .env
```

| Variabel | Keterangan |
|---|---|
| `DATABASE_URL` | URL koneksi PostgreSQL via pooler (port **6543**) — untuk runtime/production |
| `DIRECT_URL` | URL koneksi langsung PostgreSQL (port **5432**) — untuk migrasi dan seed |
| `SUPABASE_URL` | URL project Supabase |
| `SUPABASE_SERVICE_KEY` | Service role key Supabase (untuk operasi storage server-side) |
| `SUPABASE_ANON_KEY` | Anon/public key Supabase |
| `JWT_SECRET` | Secret key untuk sign JWT token — gunakan string panjang acak |
| `PORT` | Port server (default: `4000`) |
| `STREAM_API_KEY` | API key untuk Stream Chat |
| `STREAM_API_SECRET` | Secret key Stream Chat |
| `MIDTRANS_SERVER_KEY` | Server key Midtrans (**RAHASIA** — tidak boleh dikirim ke frontend) |
| `MIDTRANS_CLIENT_KEY` | Client key Midtrans (aman untuk frontend) |
| `MIDTRANS_IS_PRODUCTION` | `false` untuk sandbox, `true` untuk production |
| `MIDTRANS_SNAP_URL` | URL Snap.js Midtrans |
| `SMTP_HOST` | SMTP server host untuk email laporan dividen |
| `SMTP_PORT` | SMTP port (biasanya `587`) |
| `SMTP_USER` | Email pengirim laporan |
| `SMTP_PASS` | Password email pengirim |
| `CSC_EMAIL` | Email penerima laporan dividen (Ketua CSC) |
| `CCI_EMAIL` | Email penerima laporan dividen (Ketua CCI) |

### Jalankan Migrasi Database

```bash
npx prisma migrate deploy
```

### Isi Data Awal (Seed)

```bash
npm run seed
```

Seed akan membuat semua akun testing, kategori, merchant, dan gig awal secara otomatis. Lihat tabel akun di bagian berikutnya.

### Jalankan Server

```bash
npm run start:dev
```

Server berjalan di: **http://localhost:4000**

### Buka Prisma Studio (opsional — untuk melihat data secara visual)

```bash
npx prisma studio
```

Buka http://localhost:5555 di browser.

---

## 2. Akun Testing (Seed Data)

Setelah `npm run seed`, akun-akun berikut sudah tersedia. **Semua password: `Test1234!`**

| Email | Role | Endpoint Login | Keterangan |
|---|---|---|---|
| `superadmin@test.com` | Super Admin | `POST /auth/admin/login` | Akses penuh ke seluruh sistem |
| `validator@test.com` | Admin Validator | `POST /auth/login` | Verifikasi KYB, gig, sengketa |
| `finance@test.com` | Finance Admin | `POST /auth/login` | Verifikasi bayar, withdrawal, laporan |
| `merchant@test.com` | Merchant Owner | `POST /auth/login` | Pemilik "Toko Test CCI" |
| `associate@test.com` | Merchant Associate | `POST /auth/login` | Staf "Toko Test CCI" |
| `client@test.com` | Client | `POST /auth/login` | Pembeli/pengguna jasa |

> **Penting:** Super Admin **wajib** login di `POST /auth/admin/login`. Login di `/auth/login` akan ditolak.

### Data Tambahan dari Seed

| Data | Detail |
|---|---|
| Merchant | "Toko Test CCI" — status `ACTIVE`, saldo wallet Rp 500.000 |
| Bank account | BCA, nomor `1234567890`, atas nama Merchant Owner (primary) |
| PIN Withdrawal | `123456` |
| Gig | "Jasa Desain Logo" — Creative Studio, harga Rp 150.000, status `ACTIVE` |
| Kategori | Creative Studio (5%), Tech and Digital (5%), Event Essentials (3%), Consumptions (3%), Merchandise and Apparels (4%), Talents and Performers (5%) |

---

## 3. Base URL dan Format Request

```
Base URL: http://localhost:4000/api/v1
```

### Header Standar

| Header | Nilai |
|---|---|
| `Content-Type` | `application/json` |
| `Authorization` | `Bearer <token>` (wajib untuk endpoint yang memerlukan auth) |

### Upload File (Multipart)

Untuk endpoint upload file, gunakan `Content-Type: multipart/form-data`. Di Postman, pilih Body → **form-data** dan pilih tipe **File** untuk key file. Jangan set Content-Type secara manual — Postman akan mengaturnya otomatis termasuk boundary.

---

## 4. Referensi Status Order

| Status | Artinya |
|---|---|
| `UNPAID` | Order dibuat, menunggu pembayaran |
| `PAID_PENDING_CONFIRMATION` | Bukti transfer manual diupload, menunggu konfirmasi Finance |
| `IN_PROGRESS` | Pembayaran terkonfirmasi, pengerjaan sedang berjalan |
| `DELIVERED` | Vendor kirim hasil, menunggu review client (timer 3×24 jam) |
| `IN_REVISION` | Client minta perbaikan |
| `COMPLETED` | Client menerima hasil, dana cair ke wallet vendor |
| `CANCELLED` | Order dibatalkan (hanya dari `UNPAID`) |
| `REFUNDED` | Dana dikembalikan ke client |
| `DISPUTE_IN_PROGRESS` | Sedang dalam sengketa — semua aksi dibekukan, deadline ditunda |
| `REFUND_APPROVED_WAITING_FINANCE` | Validator setujui refund — menunggu eksekusi Finance |
| `RELEASE_APPROVED_WAITING_FINANCE` | Validator tolak komplain — menunggu eksekusi Finance (dana ke vendor) |

---

## 5. Alur Testing Lengkap (Flow A–N)

Ikuti urutan flow dari A karena flow berikutnya bergantung pada data yang dibuat sebelumnya. Gunakan Postman dan simpan token setiap role ke variable environment Postman untuk kemudahan.

---

### FLOW A — Autentikasi

#### A1. Login Semua Role (kecuali Super Admin)

```
POST /auth/login
Content-Type: application/json
```

```json
{
  "email": "merchant@test.com",
  "password": "Test1234!"
}
```

Ulangi untuk: `validator@test.com`, `finance@test.com`, `associate@test.com`, `client@test.com`.

**Expected response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 4,
    "email": "merchant@test.com",
    "role": "MERCHANT_OWNER"
  }
}
```

#### A2. Login Super Admin (endpoint khusus)

```
POST /auth/admin/login
Content-Type: application/json
```

```json
{
  "email": "superadmin@test.com",
  "password": "Test1234!"
}
```

> Login Super Admin di `/auth/login` akan mendapat `403 Forbidden`.

#### A3. Lihat Profil Diri Sendiri

```
GET /auth/profile
Authorization: Bearer <token>
```

#### A4. Test IP Block (3× Login Gagal)

Coba login 3× dengan password salah. Percobaan ke-4 harus mendapat:

```json
{
  "statusCode": 429,
  "message": "IP Anda diblokir sementara. Coba lagi dalam 15 menit."
}
```

---

### FLOW B — KYB Vendor (Verifikasi Identitas Toko)

> Akun `merchant@test.com` dari seed sudah berstatus `ACTIVE`. Flow B cocok untuk testing dengan akun merchant baru.

#### B1. Daftar Merchant Baru

```
POST /merchants/register
Content-Type: application/json
```

```json
{
  "email": "merchant2@test.com",
  "password": "Test1234!",
  "fullName": "Vendor Baru",
  "shopName": "Studio Kreatif Alpha",
  "description": "Jasa desain dan kreatif untuk acara kampus",
  "logoUrl": "https://example.com/logo.png",
  "bannerUrl": "https://example.com/banner.png",
  "bankName": "BRI",
  "accountNumber": "987654321",
  "accountHolderName": "Vendor Baru"
}
```

**Expected:** Status toko `INCOMPLETE`.

#### B2. Submit Dokumen KYB

```
PATCH /merchants/submit-kyb
Authorization: Bearer <token_merchant_baru>
Content-Type: application/json
```

```json
{
  "kybDocumentUrl": "https://example.com/ktm-vendor.pdf",
  "portfolioUrl": "https://example.com/portofolio.pdf"
}
```

**Expected:** Status toko → `PENDING_VERIFICATION`. Validator mendapat notifikasi.

#### B3. Validator Lihat Antrian Verifikasi

```
GET /admin/validator/merchants/pending
Authorization: Bearer <token_validator>
```

#### B4a. Validator Approve KYB

```
PATCH /admin/validator/merchants/:merchantId/verify
Authorization: Bearer <token_validator>
Content-Type: application/json
```

```json
{
  "isApproved": true
}
```

**Expected:** Status → `ACTIVE`, badge `NEWCOMER` diberikan.

#### B4b. Validator Reject KYB

```
PATCH /admin/validator/merchants/:merchantId/verify
Authorization: Bearer <token_validator>
Content-Type: application/json
```

```json
{
  "isApproved": false,
  "rejectionReason": "Foto KTM buram, tidak terbaca. Mohon upload ulang dengan kualitas lebih baik."
}
```

**Expected:** Status → `REJECTED`.

#### B5. Merchant Acknowledge Rejection (wajib sebelum re-submit)

```
PATCH /merchants/kyb/acknowledge-rejection
Authorization: Bearer <token_merchant_baru>
```

**Expected:** Status kembali ke `INCOMPLETE`. Merchant bisa submit ulang (ulangi B2).

#### B6. Suspend Merchant (oleh Validator)

```
PATCH /admin/validator/merchants/:merchantId/suspend
Authorization: Bearer <token_validator>
Content-Type: application/json
```

```json
{
  "isSuspended": true,
  "reason": "Pelanggaran berulang terhadap syarat layanan"
}
```

**Expected:** Merchant tidak bisa login (akun terkunci).

#### B7. Unsuspend Merchant (hanya Super Admin)

```
PATCH /admin/validator/merchants/:merchantId/suspend
Authorization: Bearer <token_super_admin>
Content-Type: application/json
```

```json
{
  "isSuspended": false
}
```

> Validator yang mencoba unsuspend akan mendapat `403 Forbidden`.

---

### FLOW C — Manajemen Jasa (Gig)

#### C1. Tambah Associate/Staf ke Toko

```
POST /merchant-associates
Authorization: Bearer <token_merchant>
Content-Type: application/json
```

```json
{
  "email": "associate@test.com",
  "permission": "FULL_ACCESS"
}
```

> Opsi `permission`: `MANAGE_ORDERS`, `MANAGE_GIGS`, `FULL_ACCESS`

#### C2. Buat Gig Baru

```
POST /gigs
Authorization: Bearer <token_merchant>
Content-Type: application/json
```

```json
{
  "categoryId": 1,
  "title": "Jasa Desain Poster Acara",
  "description": "Desain poster profesional untuk semua jenis acara kampus. Revisi 2x.",
  "price": 250000,
  "mediaUrls": "https://example.com/portofolio-poster.jpg"
}
```

**Expected:** Status gig → `PENDING_APPROVAL`. Validator mendapat notifikasi.

#### C3. Validator Lihat Gig Pending

```
GET /admin/validator/gigs/pending
Authorization: Bearer <token_validator>
```

#### C4a. Validator Approve Gig

```
PATCH /admin/validator/gigs/:gigId/verify
Authorization: Bearer <token_validator>
Content-Type: application/json
```

```json
{
  "isApproved": true
}
```

**Expected:** Status gig → `ACTIVE`.

#### C4b. Validator Reject Gig

```
PATCH /admin/validator/gigs/:gigId/verify
Authorization: Bearer <token_validator>
Content-Type: application/json
```

```json
{
  "isApproved": false,
  "rejectionReason": "Deskripsi tidak informatif. Mohon sertakan contoh hasil karya."
}
```

#### C5. Cek Gig Muncul di Pencarian Publik

```
GET /gigs
```

**Expected:** Hanya gig berstatus `ACTIVE` yang muncul.

---

### FLOW D — Pesanan Direct Order (via Midtrans)

Alur utama transaksi menggunakan Midtrans sebagai payment gateway.

#### D1. Client Buat Order

```
POST /orders
Authorization: Bearer <token_client>
Content-Type: application/json
```

```json
{
  "gigId": 1
}
```

**Expected response:**
```json
{
  "id": 1,
  "status": "UNPAID",
  "totalAmount": 150000,
  "adminFee": 7500
}
```

> `adminFee` = `totalAmount × commissionRate`. Creative Studio 5% → Rp 7.500.

#### D2. Initiate Pembayaran Midtrans

```
POST /orders/:orderId/initiate-payment
Authorization: Bearer <token_client>
```

**Expected response:**
```json
{
  "snapToken": "66e4fa55-fdac-4ef9-91b5-733b97d1b862",
  "clientKey": "SB-Mid-client-xxxxxx",
  "redirectUrl": "https://app.sandbox.midtrans.com/snap/v4/redirection/..."
}
```

> Di frontend, gunakan `snapToken` untuk memanggil `window.snap.pay(snapToken)`. Untuk testing backend saja, simulasikan webhook (lihat **Seksi 6**).

#### D3. Simulasi Webhook Settlement

Lihat **Seksi 6** untuk cara menghitung signature dan contoh payload lengkap.

**Expected setelah webhook settlement diterima:** Status order → `IN_PROGRESS`, `pendingBalance` merchant bertambah, Merchant mendapat notifikasi pesanan baru.

#### D4. Merchant Accept Order

```
PATCH /orders/:orderId/accept
Authorization: Bearer <token_merchant>
```

#### D5. Merchant Deliver Pekerjaan

```
POST /deliverables
Authorization: Bearer <token_merchant>
Content-Type: application/json
```

```json
{
  "orderId": 1,
  "fileUrl": "https://drive.google.com/hasil-desain-logo-final.zip",
  "message": "Halo kak, pesanan sudah selesai! Mohon dicek dan dikonfirmasi."
}
```

**Expected:** Status order → `DELIVERED`. Client mendapat notifikasi.

#### D6. Client Terima Pesanan

```
PATCH /orders/:orderId/complete
Authorization: Bearer <token_client>
```

**Expected:** Status → `COMPLETED`. Dana (Rp 150.000 − Rp 7.500 = **Rp 142.500**) masuk ke `walletBalance` merchant.

#### D7. Client Beri Ulasan

```
POST /reviews
Authorization: Bearer <token_client>
Content-Type: application/json
```

```json
{
  "orderId": 1,
  "rating": 5,
  "comment": "Sangat puas! Desain keren, pengerjaan cepat."
}
```

#### D8. Download Invoice PDF

```
GET /orders/:orderId/invoice
Authorization: Bearer <token_client>
```

**Expected:** File PDF didownload berisi detail transaksi. Hanya tersedia untuk order berstatus `COMPLETED`.

---

### FLOW E — Pesanan via Custom Offer

#### E1. Merchant Buat Custom Offer

```
POST /custom-offers/sent
Authorization: Bearer <token_merchant>
Content-Type: application/json
```

```json
{
  "clientId": 5,
  "gigId": 1,
  "channelId": "gig-1-client-5",
  "title": "Paket Desain Logo + Kartu Nama",
  "description": "Bundling spesial dengan harga terjangkau",
  "price": 350000,
  "deadlineDays": 5
}
```

#### E2. Client Lihat Custom Offer

```
GET /custom-offers/client
Authorization: Bearer <token_client>
```

#### E3. Client Terima Offer → Order Otomatis Terbuat

```
PATCH /custom-offers/:offerId/accept
Authorization: Bearer <token_client>
Content-Type: application/json
```

```json
{
  "messageId": "1a2b3c4d-5e6f-7890-abcd-ef1234567890"
}
```

**Expected:** Order dibuat otomatis dengan status `UNPAID`. Lanjutkan dari langkah D2.

#### E4. Client Tolak Offer

```
PATCH /custom-offers/:offerId/reject
Authorization: Bearer <token_client>
Content-Type: application/json
```

```json
{
  "messageId": "1a2b3c4d-5e6f-7890-abcd-ef1234567890"
}
```

---

### FLOW F — Pembayaran Manual (Fallback Transfer Bank)

Digunakan jika client memilih transfer manual alih-alih Midtrans.

#### F1. Upload Foto Bukti Transfer

Di Postman, pilih Body → **form-data**:

```
POST /orders/:orderId/upload-payment-proof
Authorization: Bearer <token_client>
Content-Type: multipart/form-data

Key: file  (tipe: File)  → pilih foto/screenshot bukti transfer
```

**Expected:** File tersimpan di Supabase Storage. Status order → `PAID_PENDING_CONFIRMATION`. Finance Admin mendapat notifikasi.

#### F2. Finance Admin Konfirmasi Pembayaran

```
PATCH /transactions/:transactionId/verify
Authorization: Bearer <token_finance>
Content-Type: application/json
```

```json
{
  "status": "VERIFIED",
  "verificationNote": "Nominal cocok Rp 150.000 atas nama Client User tgl 18/05/2026"
}
```

**Expected:** Status order → `IN_PROGRESS`. Merchant mendapat notifikasi.

#### F3. Finance Admin Tolak Pembayaran

```
PATCH /transactions/:transactionId/verify
Authorization: Bearer <token_finance>
Content-Type: application/json
```

```json
{
  "status": "REJECTED",
  "verificationNote": "Nominal tidak sesuai — terkirim Rp 100.000 bukan Rp 150.000"
}
```

**Expected:** Status order kembali ke `UNPAID`. Client mendapat notifikasi untuk upload ulang.

---

### FLOW G — Revisi Pekerjaan

#### G1. Client Request Revisi (setelah status DELIVERED)

```
PATCH /orders/:orderId/revision
Authorization: Bearer <token_client>
Content-Type: application/json
```

```json
{
  "revisionNote": "Warna font kurang kontras. Mohon ganti background menjadi lebih gelap."
}
```

**Expected:** Status → `IN_REVISION`.

#### G2. Merchant Kirim Ulang Hasil

```
POST /deliverables
Authorization: Bearer <token_merchant>
Content-Type: application/json
```

```json
{
  "orderId": 1,
  "fileUrl": "https://drive.google.com/hasil-revisi-v2.zip",
  "message": "Sudah diperbaiki sesuai masukan kak!"
}
```

**Expected:** Status kembali ke `DELIVERED`.

---

### FLOW H — Sengketa (Dispute)

> Sengketa dibuka langsung oleh Client melalui aplikasi dengan melampirkan bukti.

#### H1. Client Buka Tiket Sengketa

```
POST /disputes
Authorization: Bearer <token_client>
Content-Type: multipart/form-data
```

Gunakan **form-data** pada body request di Postman dengan parameter:
*   `orderId`: ID Pesanan (number)
*   `reason`: Alasan sengketa (string)
*   `file` (tipe: File): File bukti sengketa (wajib, max 5MB, format jpg/jpeg/png/pdf)

**Expected:** File bukti sengketa diunggah ke Supabase Storage (bucket `merchant-assets`). Status order → `DISPUTE_IN_PROGRESS`. Deadline order dibekukan.

> Pengguna dengan role selain CLIENT yang mencoba membuka tiket sengketa akan mendapat `403 Forbidden`.

#### H2. Validator Submit Verdict (Tahap 1 — Simpan Keputusan)

```
PATCH /admin/validator/disputes/:disputeId/submit-verdict
Authorization: Bearer <token_validator>
Content-Type: application/json
```

```json
{
  "verdict": "APPROVE_REFUND",
  "notes": "Bukti dari client kuat. Hasil tidak sesuai deskripsi gig."
}
```

**Expected:** Keputusan tersimpan sebagai `pendingVerdict`. Status dispute → `UNDER_REVIEW`. Belum ada perubahan uang atau status order.

#### H3. Validator Confirm Verdict (Tahap 2 — Eksekusi)

```
PATCH /admin/validator/disputes/:disputeId/confirm-verdict
Authorization: Bearer <token_validator>
```

**Expected:** Status order → `REFUND_APPROVED_WAITING_FINANCE`. Finance Admin mendapat notifikasi.

> Untuk tolak komplain (dana ke merchant): gunakan `"verdict": "REJECT_COMPLAINT"` di H2 → order berubah ke `RELEASE_APPROVED_WAITING_FINANCE`.

#### H4a. Finance Admin Eksekusi Refund

```
PATCH /orders/:orderId/execute-refund
Authorization: Bearer <token_finance>
```

**Expected:** Status → `REFUNDED`. `pendingBalance` merchant berkurang. Dispute ditutup. Client mendapat notifikasi. Jika order dibayar via Midtrans, sistem otomatis memanggil Midtrans Refund API.

#### H4b. Finance Admin Eksekusi Release Dana ke Merchant

```
PATCH /orders/:orderId/execute-release
Authorization: Bearer <token_finance>
```

**Expected:** Status → `COMPLETED`. Dana cair ke `walletBalance` merchant (minus komisi). Dispute ditutup.

---

### FLOW I — Banding (Appeal)

#### I1. Client atau Merchant Ajukan Banding

```
POST /appeals
Authorization: Bearer <token_client_atau_merchant>
Content-Type: application/json
```

```json
{
  "orderId": 1,
  "reason": "Saya merasa keputusan tidak adil. Saya sudah mengirim hasil sesuai spesifikasi dan ada bukti konfirmasi sebelumnya.",
  "evidenceUrls": "https://drive.google.com/bukti-banding.png"
}
```

**Expected:** Super Admin mendapat notifikasi. Hanya satu banding per order per pihak.

#### I2. Super Admin Lihat Semua Banding

```
GET /appeals
Authorization: Bearer <token_super_admin>
```

#### I3. Super Admin Executive Decision

```
PATCH /admin/validator/disputes/:disputeId/executive-decision
Authorization: Bearer <token_super_admin>
Content-Type: application/json
```

```json
{
  "decision": "FORCE_REFUND",
  "notes": "Setelah review bukti banding, memutuskan refund ke client."
}
```

> Opsi: `FORCE_REFUND` atau `FORCE_RELEASE`. Langsung dari `DISPUTE_IN_PROGRESS` tanpa perlu Finance.

---

### FLOW J — Pencairan Dana (Withdrawal)

#### J0. Set PIN Withdrawal (pertama kali)

```
PATCH /merchants/:merchantId/edit/profile
Authorization: Bearer <token_merchant>
Content-Type: application/json
```

```json
{
  "withdrawalPin": "123456"
}
```

> Dari seed, PIN sudah di-set ke `123456`.

#### J1. Merchant Request Withdrawal

```
POST /withdrawals
Authorization: Bearer <token_merchant>
Content-Type: application/json
```

```json
{
  "bankAccountId": 1,
  "amount": 100000,
  "pin": "123456"
}
```

**Expected:** `walletBalance` langsung berkurang (dana dikunci). Status withdrawal `PENDING`. Finance mendapat notifikasi.

> Minimal: **Rp 50.000**. Jika ada sengketa aktif, akan ditolak.

#### J2. Finance Admin Lihat Request Pending

```
GET /withdrawals/pending
Authorization: Bearer <token_finance>
```

#### J3. Finance Admin Selesaikan Transfer

```
PATCH /withdrawals/:withdrawalId/complete
Authorization: Bearer <token_finance>
Content-Type: application/json
```

```json
{
  "proofUrl": "https://drive.google.com/bukti-transfer-withdrawal.png"
}
```

**Expected:** Status → `COMPLETED`. Merchant mendapat notifikasi "Dana Cair!".

#### J4. Finance Admin Tolak Request

```
PATCH /withdrawals/:withdrawalId/reject
Authorization: Bearer <token_finance>
```

**Expected:** Dana dikembalikan ke `walletBalance` merchant.

---

### FLOW K — Featured Placement (Boost Gig)

#### K1. Boost via Potong Saldo Wallet (Instan)

```
POST /featured-placements/promote
Authorization: Bearer <token_merchant>
Content-Type: application/json
```

```json
{
  "gigId": 1,
  "durationDays": 7,
  "payWithWallet": true
}
```

**Expected:** `walletBalance` berkurang. Status gig → `FEATURED`. Timer countdown mulai.

> Merchant harus punya saldo cukup (minimal Rp 50.000).

#### K2. Boost via Transfer Manual

```
POST /featured-placements/promote
Authorization: Bearer <token_merchant>
Content-Type: application/json
```

```json
{
  "gigId": 1,
  "durationDays": 7,
  "payWithWallet": false
}
```

#### K3. Upload Bukti Bayar Boost

```
POST /featured-placements/upload-proof/:featuredPlacementId
Authorization: Bearer <token_merchant>
Content-Type: application/json
```

```json
{
  "proofUrl": "https://drive.google.com/bukti-bayar-boost.png"
}
```

#### K4. Finance Admin Approve Boost

```
POST /featured-placements/admin/approve/:featuredPlacementId
Authorization: Bearer <token_finance>
```

**Expected:** Status gig → `FEATURED`. Timer countdown mulai.

#### K5. Verifikasi di Pencarian Publik

```
GET /gigs
```

**Expected:** Gig berstatus `FEATURED` muncul di posisi teratas.

> **Test Associate tidak bisa boost:** Login sebagai associate, coba `POST /featured-placements/promote` → harus mendapat `403 Forbidden`.

---

### FLOW L — Konfigurasi Sistem (Super Admin)

#### L1. Lihat Semua Konfigurasi

```
GET /system-config
Authorization: Bearer <token_super_admin>
```

**Expected response:**
```json
[
  { "key": "maintenance_mode", "value": "false" },
  { "key": "default_commission_rate", "value": "5" }
]
```

#### L2. Ubah Tarif Komisi per Kategori

```
PUT /system-config/commission_rate_1
Authorization: Bearer <token_super_admin>
Content-Type: application/json
```

```json
{
  "value": "6",
  "confirmPassword": "Test1234!"
}
```

**Expected:** Komisi kategori 1 berubah ke 6%. Order lama tidak berubah — hanya order baru yang menggunakan rate baru. Tanpa `confirmPassword` atau password salah → `401 Unauthorized`.

#### L3. Aktifkan Maintenance Mode

```
PUT /system-config/maintenance_mode
Authorization: Bearer <token_super_admin>
Content-Type: application/json
```

```json
{
  "value": "true",
  "confirmPassword": "Test1234!"
}
```

**Test:** Coba login sebagai client → harus mendapat `503 Service Unavailable`. Login Super Admin tetap berhasil.

#### L4. Nonaktifkan Maintenance Mode

```
PUT /system-config/maintenance_mode
Authorization: Bearer <token_super_admin>
Content-Type: application/json
```

```json
{
  "value": "false",
  "confirmPassword": "Test1234!"
}
```

#### L5. Lihat Audit Log

```
GET /system-config/audit-logs
Authorization: Bearer <token_super_admin>
```

**Expected:** Log semua perubahan config: siapa, kapan, nilai lama, nilai baru.

---

### FLOW M — Laporan Keuangan Bulanan

#### M1. Generate Laporan

```
POST /monthly-reports/generate
Authorization: Bearer <token_finance>
Content-Type: application/json
```

```json
{
  "period": "2026-05"
}
```

**Expected:** Laporan dibuat status `DRAFT`. GMV, Gross Revenue, Commission Fee dihitung otomatis dari semua transaksi bulan tersebut.

#### M2. Input Biaya Operasional

```
PATCH /monthly-reports/:reportId/operational-cost
Authorization: Bearer <token_finance>
Content-Type: application/json
```

```json
{
  "operationalCost": 2500000
}
```

> Hanya bisa saat status masih `DRAFT`.

#### M3. Proses Pembagian Dividen

```
POST /monthly-reports/:reportId/process-dividend
Authorization: Bearer <token_finance>
Content-Type: application/json
```

```json
{
  "cscPercentage": 60,
  "cciPercentage": 40
}
```

**Expected:** Status → `PROCESSED`. Jumlah dividen CSC dan CCI dihitung dari `Net Profit`.

#### M4. Kunci Laporan (Close Book)

```
POST /monthly-reports/:reportId/lock
Authorization: Bearer <token_finance>
```

**Expected:** Status → `LOCKED`. Data tidak bisa diubah. Email PDF dividen otomatis terkirim ke CSC dan CCI jika konfigurasi SMTP sudah diisi.

**Test proteksi:** Coba ubah `operational-cost` setelah dikunci → harus mendapat `400 Bad Request`.

#### M5. Upload Bukti Transfer Dividen

```
POST /monthly-reports/:reportId/upload-proof
Authorization: Bearer <token_finance>
Content-Type: application/json
```

```json
{
  "proofUrl": "https://drive.google.com/bukti-dividen-mei-2026.png"
}
```

> Hanya bisa setelah status `LOCKED`.

#### M6. Lihat Semua Laporan

```
GET /monthly-reports
Authorization: Bearer <token_finance>
```

---

### FLOW N — Leaderboard & Badge

#### N1. Lihat Leaderboard (Publik — Tanpa Auth)

```
GET /merchants/leaderboard
```

**Expected response:**
```json
{
  "mostBooked": [
    { "merchantId": 1, "shopName": "Toko Test CCI", "completedOrders": 10 }
  ],
  "bestRating": [
    { "merchantId": 1, "shopName": "Toko Test CCI", "avgRating": 4.8 }
  ],
  "fastestResponse": [
    { "merchantId": 1, "shopName": "Toko Test CCI", "avgResponseHours": 2.5 }
  ]
}
```

#### N2. Cek Badge Merchant

```
GET /merchants/profile
Authorization: Bearer <token_merchant>
```

| Badge | Syarat Otomatis |
|---|---|
| `NEWCOMER` | KYB di-approve |
| `RISING_STAR` | 5+ order `COMPLETED` |
| `STAR_VENDOR` | 10+ order `COMPLETED` + rata-rata rating ≥ 4.0 |
| `SIGNATURE_PARTNER` | 25+ order `COMPLETED` + rata-rata rating ≥ 4.5 |

---

## 6. Testing Webhook Midtrans

### Setup ngrok (Tunnel ke Localhost)

1. Download dan install ngrok: https://ngrok.com/download
2. Jalankan tunnel:
   ```bash
   ngrok http 4000
   ```
3. Catat URL yang diberikan ngrok, contoh: `https://abc123.ngrok.io`
4. Daftarkan URL webhook di Midtrans Dashboard → Settings → Configuration:
   ```
   https://abc123.ngrok.io/api/v1/payments/midtrans/webhook
   ```

### Cara Menghitung Signature (Wajib)

Midtrans memverifikasi keaslian setiap webhook menggunakan SHA-512:

```
signature = SHA512(order_id + status_code + gross_amount + server_key)
```

#### Script PowerShell

```powershell
$orderId     = "ORDER-1"
$statusCode  = "200"
$grossAmount = "150000.00"
$serverKey   = "SB-Mid-server-xxxxxxxxxxxxxxxx"

$rawString = $orderId + $statusCode + $grossAmount + $serverKey

$sha512    = [System.Security.Cryptography.SHA512]::Create()
$bytes     = [System.Text.Encoding]::UTF8.GetBytes($rawString)
$hashBytes = $sha512.ComputeHash($bytes)
$signature = [System.BitConverter]::ToString($hashBytes).Replace("-", "").ToLower()

Write-Output "Signature: $signature"
```

#### Script Bash/Node.js

```bash
node -e "
const crypto = require('crypto');
const raw = 'ORDER-1' + '200' + '150000.00' + 'SB-Mid-server-xxxxxxxxxxxxxxxx';
const sig = crypto.createHash('sha512').update(raw).digest('hex');
console.log('Signature:', sig);
"
```

### Payload — Settlement (Pembayaran Berhasil)

```
POST http://localhost:4000/api/v1/payments/midtrans/webhook
Content-Type: application/json
(Tanpa Authorization header)
```

```json
{
  "order_id": "ORDER-1",
  "transaction_id": "txn-midtrans-unique-001",
  "status_code": "200",
  "gross_amount": "150000.00",
  "transaction_status": "settlement",
  "fraud_status": "accept",
  "payment_type": "bank_transfer",
  "signature_key": "<HASIL_HITUNG_DI_ATAS>"
}
```

**Expected:** Status order → `IN_PROGRESS`.

### Payload — Expire (Pembayaran Kadaluarsa)

```json
{
  "order_id": "ORDER-1",
  "transaction_id": "txn-midtrans-unique-001",
  "status_code": "407",
  "gross_amount": "150000.00",
  "transaction_status": "expire",
  "signature_key": "<HITUNG_ULANG_DENGAN_STATUS_CODE_407>"
}
```

**Expected:** Status order → `CANCELLED`.

### Payload — Cancel

```json
{
  "order_id": "ORDER-1",
  "transaction_id": "txn-midtrans-unique-001",
  "status_code": "200",
  "gross_amount": "150000.00",
  "transaction_status": "cancel",
  "signature_key": "<HASIL_HITUNG>"
}
```

### Cara Cek Log di Terminal

Server menampilkan log setiap kali webhook masuk:
- Signature valid → proses dilanjutkan
- Signature tidak valid → `[Webhook] Invalid signature, dropping request`
- Duplikat (transaction_id sama) → `[Webhook] Duplicate transaction, skipping`

---

## 7. Referensi Endpoint Lengkap

Semua endpoint menggunakan prefix `/api/v1`.

### Authentication

| Method | Endpoint | Auth | Keterangan |
|---|---|---|---|
| POST | `/auth/login` | Tidak | Login semua role kecuali Super Admin |
| POST | `/auth/admin/login` | Tidak | Login khusus Super Admin |
| GET | `/auth/profile` | Ya | Profil user yang sedang login |

### Users

| Method | Endpoint | Auth | Keterangan |
|---|---|---|---|
| POST | `/users` | Tidak | Daftar akun baru (role selalu `CLIENT`) |
| GET | `/users` | Ya | List semua user (Admin) |

### Categories

| Method | Endpoint | Auth | Keterangan |
|---|---|---|---|
| POST | `/categories` | Ya (Super Admin) | Buat kategori baru |
| GET | `/categories` | Tidak | List semua kategori |
| GET | `/categories/:id` | Tidak | Detail kategori |
| PATCH | `/categories/:id` | Ya (Super Admin) | Update kategori |
| DELETE | `/categories/:id` | Ya (Super Admin) | Hapus kategori |

### Merchants

| Method | Endpoint | Auth | Keterangan |
|---|---|---|---|
| POST | `/merchants/register` | Tidak | Daftar merchant baru |
| GET | `/merchants` | Tidak | List merchant (ACTIVE + VACATION) |
| GET | `/merchants/leaderboard` | Tidak | Leaderboard publik (3 kategori) |
| GET | `/merchants/profile` | Ya | Profil merchant milik sendiri |
| GET | `/merchants/details/:id` | Tidak | Detail merchant by ID |
| PATCH | `/merchants/:id/edit/profile` | Ya (Owner) | Update profil toko |
| PATCH | `/merchants/submit-kyb` | Ya (Owner) | Submit dokumen KYB |
| PATCH | `/merchants/kyb/acknowledge-rejection` | Ya (Owner) | Acknowledge rejection → kembali ke INCOMPLETE |
| PATCH | `/merchants/vacation-mode` | Ya (Owner) | Toggle mode liburan |
| PATCH | `/merchants/closed` | Ya (Owner) | Tutup toko |
| POST | `/merchants/:id/associates` | Ya (Owner) | Tambah associate (alias RESTful) |

### Withdrawals

| Method | Endpoint | Auth | Keterangan |
|---|---|---|---|
| POST | `/withdrawals` | Ya (Owner) | Request withdrawal (min Rp 50.000) |
| GET | `/withdrawals` | Ya (Owner) | Riwayat withdrawal merchant |
| GET | `/withdrawals/:id` | Ya (Owner) | Detail withdrawal |
| GET | `/withdrawals/pending` | Ya (Finance) | Antrian withdrawal pending |
| PATCH | `/withdrawals/:id/complete` | Ya (Finance) | Tandai selesai + upload bukti |
| PATCH | `/withdrawals/:id/reject` | Ya (Finance) | Tolak request |

### Merchant Associates

| Method | Endpoint | Auth | Keterangan |
|---|---|---|---|
| POST | `/merchant-associates` | Ya (Owner) | Tambah associate |
| GET | `/merchant-associates` | Ya | List associate merchant |

### Gigs

| Method | Endpoint | Auth | Keterangan |
|---|---|---|---|
| POST | `/gigs` | Ya (Owner/Associate) | Buat gig baru (masuk `PENDING_APPROVAL`) |
| GET | `/gigs` | Tidak | List gig ACTIVE publik |
| GET | `/gigs/my-gigs` | Ya | Gig milik merchant |
| GET | `/gigs/details/:id` | Tidak | Detail gig |
| DELETE | `/gigs/:id` | Ya | Hapus gig |

### Orders

| Method | Endpoint | Auth | Keterangan |
|---|---|---|---|
| POST | `/orders` | Ya (Client) | Buat order dari gig |
| GET | `/orders/my-orders` | Ya | Order milik client |
| GET | `/orders/incoming` | Ya (Merchant/Associate) | Order masuk ke merchant |
| GET | `/orders/:id` | Ya (Client/Owner/Associate) | Detail order — otorisasi: client pemesan, merchant owner, atau associate (`MANAGE_ORDERS`/`FULL_ACCESS`). Include `deliverables` dan `client` data |
| POST | `/orders/:id/initiate-payment` | Ya (Client) | Inisiasi pembayaran Midtrans → dapat `snapToken` |
| POST | `/orders/:id/upload-payment-proof` | Ya (Client) | Upload bukti transfer manual (multipart) |
| PATCH | `/orders/:id/accept` | Ya (Merchant/Associate) | Merchant terima order |
| PATCH | `/orders/:id/decline` | Ya (Merchant/Associate) | Merchant tolak order → `REFUNDED` |
| PATCH | `/orders/:id/complete` | Ya (Client) | Client terima hasil → `COMPLETED` |
| PATCH | `/orders/:id/cancel` | Ya (Client) | Batalkan order (hanya dari `UNPAID`) |
| GET | `/orders/:id/invoice` | Ya (Client) | Download invoice PDF (hanya `COMPLETED`) |

### Custom Offers

| Method | Endpoint | Auth | Keterangan |
|---|---|---|---|
| POST | `/custom-offers/sent` | Ya (Merchant/Associate) | Buat penawaran custom. Associate harus memiliki izin `MANAGE_ORDERS` atau `FULL_ACCESS` |
| GET | `/custom-offers/client` | Ya (Client) | Penawaran yang diterima client |
| PATCH | `/custom-offers/:id/accept` | Ya (Client) | Terima → order otomatis terbuat |
| PATCH | `/custom-offers/:id/reject` | Ya (Client) | Tolak penawaran |

### Deliverables

| Method | Endpoint | Auth | Keterangan |
|---|---|---|---|
| POST | `/deliverables` | Ya (Merchant/Associate) | Submit hasil pekerjaan |

### Reviews

| Method | Endpoint | Auth | Keterangan |
|---|---|---|---|
| POST | `/reviews` | Ya (Client) | Beri ulasan setelah `COMPLETED` |

### Transactions

| Method | Endpoint | Auth | Keterangan |
|---|---|---|---|
| GET | `/transactions/my-history` | Ya | Riwayat transaksi sendiri |
| GET | `/transactions/all` | Ya (Finance/Super Admin) | Semua transaksi (include `order.status` untuk kalkulasi escrow) |
| GET | `/transactions/financial-summary` | Ya (Finance/Super Admin) | Ringkasan finansial: saldo escrow, GMV, platform revenue, pertumbuhan %. Query: `?period=day\|week\|month` |
| PATCH | `/transactions/:id/verify` | Ya (Finance) | Verifikasi pembayaran manual |
| GET | `/transactions/pending-refunds` | Ya (Finance) | Order menunggu refund |
| GET | `/transactions/pending-releases` | Ya (Finance) | Order menunggu release dana |
| PATCH | `/transactions/:id/refund` | Ya (Finance) | Eksekusi refund |
| PATCH | `/transactions/:id/release` | Ya (Finance) | Release dana ke merchant |

### Payments

| Method | Endpoint | Auth | Keterangan |
|---|---|---|---|
| POST | `/payments/midtrans/webhook` | **Tidak** | Webhook Midtrans (publik, validasi signature) |

### Admin Validator

| Method | Endpoint | Auth | Keterangan |
|---|---|---|---|
| GET | `/admin/validator/merchants/pending` | Ya (Validator/SA) | Antrian verifikasi merchant |
| GET | `/admin/validator/gigs/pending` | Ya (Validator/SA) | Antrian verifikasi gig |
| PATCH | `/admin/validator/merchants/:id/verify` | Ya (Validator) | Approve/reject KYB |
| PATCH | `/admin/validator/gigs/:id/verify` | Ya (Validator) | Approve/reject gig |
| PATCH | `/admin/validator/merchants/:id/suspend` | Ya (Validator: suspend; SA: unsuspend) | Suspend/unsuspend merchant |
| PATCH | `/admin/validator/disputes/:id/submit-verdict` | Ya (Validator) | Simpan keputusan sengketa (tahap 1) |
| PATCH | `/admin/validator/disputes/:id/confirm-verdict` | Ya (Validator) | Eksekusi keputusan (tahap 2) |
| PATCH | `/admin/validator/disputes/:id/executive-decision` | Ya (Super Admin) | Override keputusan langsung |

### Disputes

| Method | Endpoint | Auth | Keterangan |
|---|---|---|---|
| POST | `/disputes` | Ya (Client) | Buka tiket sengketa dengan bukti (multipart) |
| PATCH | `/disputes/:id/resolve` | Ya (Admin) | Resolve dispute (endpoint lama) |

### Appeals

| Method | Endpoint | Auth | Keterangan |
|---|---|---|---|
| POST | `/appeals` | Ya (Client/Merchant) | Ajukan banding |
| GET | `/appeals` | Ya (Super Admin) | Lihat semua banding |
| PATCH | `/appeals/:id/resolve` | Ya (Super Admin) | Selesaikan banding |

### Featured Placements

| Method | Endpoint | Auth | Keterangan |
|---|---|---|---|
| POST | `/featured-placements/promote` | Ya (Owner) | Boost gig (via wallet atau transfer manual) |
| POST | `/featured-placements/upload-proof/:id` | Ya (Owner) | Upload bukti bayar boost |
| GET | `/featured-placements/my-promotes` | Ya (Merchant) | Daftar boost milik merchant |
| POST | `/featured-placements/admin/approve/:id` | Ya (Finance) | Approve boost |
| POST | `/featured-placements/admin/reject/:id` | Ya (Finance) | Reject boost |
| GET | `/featured-placements/admin/pending` | Ya (Finance) | Boost pending approval |

### System Config

| Method | Endpoint | Auth | Keterangan |
|---|---|---|---|
| GET | `/system-config` | Ya (Super Admin) | Semua konfigurasi sistem |
| GET | `/system-config/audit-logs` | Ya (Super Admin) | Log semua perubahan konfigurasi |
| GET | `/system-config/users` | Ya (Super Admin) | List user. Query: `?status=active\|suspended` |
| GET | `/system-config/midtrans/health` | Ya (Super Admin) | Health check koneksi Midtrans |
| GET | `/system-config/analytics` | Ya (Super Admin) | Analitik transaksi: GMV, revenue, order per status. Query: `?period=day\|week\|month` |
| GET | `/system-config/maintenance` | Ya (Super Admin) | Cek status maintenance mode |
| GET | `/system-config/:key` | Ya (Super Admin) | Nilai konfigurasi by key |
| PUT | `/system-config/:key` | Ya (Super Admin) | Update konfigurasi (wajib `confirmPassword`) |
| POST | `/system-config/create-admin` | Ya (Super Admin) | Buat akun Admin Validator atau Admin Finance |
| POST | `/system-config/suspend-admin` | Ya (Super Admin) | Suspend admin (Validator/Finance) |
| POST | `/system-config/unsuspend-admin` | Ya (Super Admin) | Unsuspend admin |
| POST | `/system-config/delete-admin` | Ya (Super Admin) | Hapus akun admin (Validator/Finance) |

### Monthly Reports

| Method | Endpoint | Auth | Keterangan |
|---|---|---|---|
| POST | `/monthly-reports/generate` | Ya (Finance) | Generate laporan bulanan |
| PATCH | `/monthly-reports/:id/operational-cost` | Ya (Finance) | Input biaya operasional (hanya `DRAFT`) |
| POST | `/monthly-reports/:id/process-dividend` | Ya (Finance) | Proses dividen → `PROCESSED` |
| POST | `/monthly-reports/:id/lock` | Ya (Finance) | Kunci laporan → `LOCKED` + kirim email |
| POST | `/monthly-reports/:id/upload-proof` | Ya (Finance) | Upload bukti transfer dividen (hanya `LOCKED`) |
| GET | `/monthly-reports` | Ya (Finance) | Semua laporan |
| GET | `/monthly-reports/:id` | Ya (Finance) | Detail laporan |

### Notifications

| Method | Endpoint | Auth | Keterangan |
|---|---|---|---|
| GET | `/notifications` | Ya | Notifikasi milik sendiri |
| PATCH | `/notifications/:id/read` | Ya | Tandai satu notifikasi sudah dibaca |
| PATCH | `/notifications/read-all` | Ya | Tandai semua notifikasi sudah dibaca |

### Chat (Stream)

| Method | Endpoint | Auth | Keterangan |
|---|---|---|---|
| GET | `/chat/token` | Ya | Dapatkan token Stream Chat |
| POST | `/chat/create-channel` | Ya (Client) | Buat channel chat untuk gig |

### Upload File

| Method | Endpoint | Auth | Keterangan |
|---|---|---|---|
| POST | `/upload/image` | Tidak wajib | Upload file ke Supabase Storage |

**Rekomendasi nama folder saat upload:**

| Folder | Digunakan untuk |
|---|---|
| `merchants/logos` | Logo toko |
| `merchants/banners` | Banner toko |
| `merchants/kyb` | Dokumen KYB (KTM/SK Organisasi) |
| `gigs/media` | Gambar/katalog gig |
| `transactions/proofs` | Bukti bayar client |
| `withdrawals/proofs` | Bukti transfer withdrawal |

**Contoh response upload:**
```json
{
  "success": true,
  "url": "https://<supabase-id>.supabase.co/storage/v1/object/public/bucket/merchants/logos/logo.png"
}
```

---

## 8. Troubleshooting Umum

### Port sudah dipakai

**Gejala:** `Error: listen EADDRINUSE: address already in use :::4000`

**Solusi (PowerShell):**
```powershell
netstat -ano | findstr :4000
taskkill /PID <PID_dari_output_di_atas> /F
```

**Solusi (Bash):**
```bash
lsof -i :4000
kill -9 <PID>
```

### Database Error / Tabel Tidak Ditemukan

**Gejala:** `PrismaClientInitializationError` atau error "table not found"

**Solusi:**
1. Pastikan `DATABASE_URL` dan `DIRECT_URL` di `.env` sudah benar
2. Jalankan ulang migrasi:
   ```bash
   npx prisma migrate deploy
   npx prisma generate
   ```
3. Jika masih error (khusus dev — **data akan hilang**):
   ```bash
   npx prisma migrate reset
   npm run seed
   ```

### Token JWT Expired

**Gejala:** Response `401 Unauthorized` dengan pesan `jwt expired`

**Solusi:** Login ulang untuk mendapat token baru:
```
POST /auth/login
{ "email": "...", "password": "Test1234!" }
```

Simpan token baru ke Postman Environment.

### Webhook Midtrans Tidak Mengubah Status Order

**Cek checklist berikut:**
1. ngrok aktif dan URL sudah didaftarkan di dashboard Midtrans
2. Signature dihitung dengan urutan yang benar: `order_id + status_code + gross_amount + server_key`
3. `order_id` di payload cocok dengan ID order di database
4. `transaction_id` belum pernah diproses sebelumnya (idempotency — duplikat di-skip)
5. Cek log di terminal untuk pesan error

### Merchant PIN Tidak Valid

**Gejala:** Withdrawal ditolak meski PIN sudah di-set.

**Penyebab:** Setelah perbaikan keamanan, PIN sekarang di-hash dengan bcrypt. PIN lama yang tersimpan plain text tidak bisa diverifikasi.

**Solusi:** Set ulang PIN lewat endpoint edit profil merchant.

### Tidak Bisa Login (Maintenance Mode Aktif)

**Gejala:** Semua login mendapat `503 Service Unavailable`

**Solusi:** Login sebagai Super Admin dan nonaktifkan maintenance:
```
PUT /system-config/maintenance_mode
Authorization: Bearer <token_super_admin>

{ "value": "false", "confirmPassword": "Test1234!" }
```

### Associate Tidak Bisa Lihat Saldo atau Withdraw

Ini bukan bug — ini desain yang benar. Associate memang tidak punya akses ke wallet, saldo, dan withdrawal. Hanya Merchant Owner yang bisa mengakses fitur keuangan.
