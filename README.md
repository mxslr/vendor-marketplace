<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>

## Description

RESTful API dan Sistem Database untuk platform marketplace penyedia jasa. Dibangun menggunakan framework [NestJS](https://github.com/nestjs/nest) dengan ORM Prisma dan basis data PostgreSQL.

## Project setup

```bash
$ npm install
```

## Konfigurasi Environment Variables
Buat file .env di root directory. Isi file dengan URL koneksi database PostgreSQL
```bash
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/NAMA_DATABASE?schema=public"
```

## Sinkronisasi Prisma & Database
```bash
$ npx prisma generate
$ npx prisma migrate dev
```

## Menjalankan Server
```bash
$ npm run start:dev
```

---

## API Endpoints

Semua endpoint menggunakan prefix `/api/v1`. Berikut adalah daftar lengkap endpoint yang tersedia:

### Authentication
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/login` | No | Login & get JWT token |
| GET | `/auth/profile` | Yes | Get authenticated user profile |

### Users
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/users` | No | Create new user account |
| GET | `/users` | No | List all users |

### Categories
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/categories` | Yes (SUPER_ADMIN) | Create category |
| GET | `/categories` | No | List all categories |
| GET | `/categories/:id` | No | Get category by ID |
| PATCH | `/categories/:id` | Yes (SUPER_ADMIN) | Update category |
| DELETE | `/categories/:id` | Yes (SUPER_ADMIN) | Delete category |

### Merchants
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/merchants` | Yes | Create merchant profile |
| GET | `/merchants` | No | List all merchants |
| GET | `/merchants/profile` | Yes | Get current user's merchant profile |
| GET | `/merchants/details/:id` | No | Get merchant details by ID |
| PATCH | `/merchants/:id/edit/profile` | Yes | Update merchant profile |
| PATCH | `/merchants/submit-kyb` | Yes | Submit KYB documents |
| PATCH | `/merchants/vacation-mode` | Yes | Toggle vacation mode |
| PATCH | `/merchants/closed` | Yes | Close merchant account |

### Bank Accounts
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/bank-accounts` | Yes | Create bank account |
| GET | `/bank-accounts` | Yes | Get merchant's bank accounts |
| PATCH | `/bank-accounts/:id` | Yes | Update bank account |
| DELETE | `/bank-accounts/:id` | Yes | Delete bank account |

### Merchant Associates
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/merchant-associates` | Yes | Add associate/staff to merchant |
| GET | `/merchant-associates` | Yes | Get merchant's associates list |

### Gigs
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/gigs` | Yes | Create new gig/service |
| GET | `/gigs` | No | List all active gigs |
| GET | `/gigs/my-gigs/:id` | No | Get merchant's gigs by merchant ID |
| GET | `/gigs/details/:id` | No | Get gig details by ID |
| DELETE | `/gigs/:id` | Yes | Delete gig |

### Orders
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/orders` | Yes | Create order (direct purchase) |
| GET | `/orders/my-orders` | Yes | Get current user's orders |
| GET | `/orders/incoming` | Yes | Get incoming orders for merchant/staff |
| PATCH | `/orders/:id/pay` | Yes | Submit payment proof |
| PATCH | `/orders/:id/accept` | Yes | Merchant accepts order |
| PATCH | `/orders/:id/complete` | Yes | Client completes order |

### Custom Offers
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/custom-offers` | Yes | Create custom offer |
| GET | `/custom-offers/client` | Yes | Get custom offers for client |
| PATCH | `/custom-offers/:id/accept` | Yes | Client accepts offer |
| PATCH | `/custom-offers/:id/reject` | Yes | Client rejects offer |

### Deliverables
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/deliverables` | Yes | Submit deliverable/completed work |

### Reviews
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/reviews` | Yes | Create review for order |

### Transactions
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/transactions/my-history` | Yes | Get user's transaction history |
| GET | `/transactions/all` | Yes | Get all transactions (admin) |
| PATCH | `/transactions/:id/verify` | Yes | Verify transaction (Finance Admin) |

### Admin Validator
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/admin/validator/merchants/pending` | Yes (Admin) | Get pending merchant verifications |
| GET | `/admin/validator/gigs/pending` | Yes (Admin) | Get pending gig verifications |
| PATCH | `/admin/validator/merchants/:id/verify` | Yes (Admin) | Verify/reject merchant |
| PATCH | `/admin/validator/gigs/:id/verify` | Yes (Admin) | Verify/reject gig |
| PATCH | `/admin/validator/merchants/:id/suspend` | Yes (Admin) | Suspend merchant |

### Featured Placements
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/featured-placements/promote` | Yes (Merchant) | Create promotion/boost request |
| POST | `/featured-placements/upload-proof/:id` | Yes (Merchant) | Upload payment proof for boost |
| GET | `/featured-placements/my-promotes` | Yes (Merchant) | Get merchant's promotions |
| POST | `/featured-placements/admin/approve/:id` | Yes (Admin Finance) | Approve feature placement |
| POST | `/featured-placements/admin/reject/:id` | Yes (Admin Finance) | Reject feature placement |
| GET | `/featured-placements/admin/pending` | Yes (Admin Finance) | Get pending feature placements |

### Disputes
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/disputes` | Yes | Open dispute |
| PATCH | `/disputes/:id/resolve` | Yes | Resolve dispute (Admin) |

---

## API Testing Guide

Dokumentasi lengkap untuk menguji seluruh fitur sistem Vendor Marketplace melalui 7 fase utama.

### FASE 1: REGISTRASI & AUTENTIKASI

Sistem membutuhkan berbagai role untuk mensimulasikan ekosistem marketplace yang utuh.

#### 1. Pembuatan Akun Akses
**Endpoint:** `POST http://localhost:4000/api/v1/users`

Buat 6 akun dengan role berbeda:

```json
// Super Admin (ID 1)
{
  "email": "super@kampus.com",
  "passwordHash": "pass123",
  "fullName": "Si Paling Admin",
  "role": "SUPER_ADMIN"
}

// Admin Validator (ID 2)
{
  "email": "validator@kampus.com",
  "passwordHash": "pass123",
  "fullName": "Si Validator",
  "role": "ADMIN_VALIDATOR"
}

// Admin Finance (ID 3)
{
  "email": "finance@kampus.com",
  "passwordHash": "pass123",
  "fullName": "Ibu Bendahara",
  "role": "ADMIN_FINANCE"
}

// Merchant Owner (ID 4)
{
  "email": "vendor@kampus.com",
  "passwordHash": "pass123",
  "fullName": "Budi Creative",
  "role": "MERCHANT_OWNER"
}

// Client/Pembeli (ID 5)
{
  "email": "client@kampus.com",
  "passwordHash": "pass123",
  "fullName": "Siti Klien",
  "role": "CLIENT"
}

// Staf Toko / Associate (ID 6)
{
  "email": "udin.staf@kampus.com",
  "passwordHash": "pass123",
  "fullName": "Udin Rajin",
  "role": "MERCHANT_ASSOCIATE"
}
```

#### 2. Login & Dapatkan Token
**Endpoint:** `POST http://localhost:4000/api/v1/auth/login`

```json
{
  "email": "vendor@kampus.com",
  "password": "pass123"
}
```

**Catatan:** Login ke semua akun untuk mendapatkan token masing-masing user.

---

### FASE 2: SETUP SISTEM & TOKO VENDOR

Persiapan sebelum Vendor bisa berjualan.

#### 1. Pembuatan Kategori Jasa
**Endpoint:** `POST http://localhost:4000/api/v1/categories`  
**Token:** Super Admin

```json
{
  "name": "Web & IT Development",
  "commissionRate": 5.5
}
```

#### 2. Pembuatan Profil Toko
**Endpoint:** `POST http://localhost:4000/api/v1/merchants`  
**Token:** Merchant Owner

```json
{
  "shopName": "Budi Tech Studio",
  "description": "Bikin web cepat, murah, aman."
}
```

#### 3. Upload Dokumen Verifikasi / KYB
**Endpoint:** `PATCH http://localhost:4000/api/v1/merchants/submit-kyb`  
**Token:** Merchant Owner

```json
{
  "kybDocuments": "https://gdrive.com/ktm-budi.pdf",
  "portfolioUrl": "document cv"
}
```

#### 4. Melihat seluruh toko (merchant)
**Endpoint:** `GET http://localhost:4000/api/v1/merchants`

#### 5. Melihat detail toko by id
**Endpoint:** `GET http://localhost:4000/api/v1/merchants/details/{id}`

#### 6. Melihat profile toko sendiri
**Endpoint:** `GET http://localhost:4000/api/v1/merchants/profile`  
**Token:** Merchant Owner

#### 7. Edit profile toko by id
**Endpoint:** `PATCH http://localhost:4000/api/v1/merchants/{id}/edit/profile`  
**Token:** Merchant Owner

```json
{
  "shopName": "Budi Tech Studio Updated",
  "description": "Bikin web cepat, murah, aman dengan update terbaru."
}
```

#### 8. Merchant mode libur (Vacation-Mode)
**Endpoint:** `PATCH http://localhost:4000/api/v1/merchants/vacation-mode`  
**Token:** Merchant Owner

```json
{
  "isOnVacation": true
}
```

#### 9. Admin Memvalidasi Toko
**Endpoint:** `PATCH http://localhost:4000/api/v1/admin/validator/merchants/1/verify`  
**Token:** Admin Validator

**Jika Terima:**
```json
{
  "isApproved": true
}
```

**Jika Tolak:**
```json
{
  "isApproved": false,
  "rejectionReason": "Foto KTM buram."
}
```

#### 10. Vendor Mendaftarkan Rekening Pencairan
**Endpoint:** `POST http://localhost:4000/api/v1/bank-accounts`  
**Token:** Merchant Owner

```json
{
  "bankName": "Bank Mandiri",
  "accountNumber": "1300012345678",
  "accountHolderName": "Budi Santoso",
  "isPrimary": true
}
```

---

### FASE 3: MANAJEMEN KARYAWAN & ETALASE

Melibatkan staf untuk membantu mengelola toko dan memajang jasa di etalase.

#### 1. Bos Merekrut Staf ke Toko
**Endpoint:** `POST http://localhost:4000/api/v1/merchant-associates`  
**Token:** Merchant Owner

```json
{
  "email": "udin.staf@kampus.com",
  "permission": "FULL_ACCESS"
}
```

#### 2. Membuat Etalase Jasa / Gigs
**Endpoint:** `POST http://localhost:4000/api/v1/gigs`  
**Token:** Merchant Owner atau Staf Associate

```json
{
  "categoryId": 1,
  "title": "Jasa Pembuatan Web Company Profile",
  "description": "Website elegan dan responsif.",
  "price": 2500000,
  "mediaUrls": "https://example.com/image.jpg" // Optional: Link gambar/video portofolio
}
```

#### 3. Melihat semua gigs aktif
**Endpoint:** `GET http://localhost:4000/api/v1/gigs`

#### 4. Melihat gigs milik merchant tertentu
**Endpoint:** `GET http://localhost:4000/api/v1/gigs/my-gigs/{merchantId}`

#### 5. Melihat detail gig by id
**Endpoint:** `GET http://localhost:4000/api/v1/gigs/details/{id}`

---

### FASE 4: PEMESANAN JASA

Pembeli memiliki dua metode untuk memesan jasa.

#### OPSI A: Jalur Pembelian Langsung (Direct Order)
**Endpoint:** `POST http://localhost:4000/api/v1/orders`  
**Token:** Client

```json
{
  "gigId": 1
}
```

#### OPSI B: Jalur Negosiasi (Custom Offer)

**Tahap 1: Vendor Mengirim Penawaran**  
**Endpoint:** `POST http://localhost:4000/api/v1/custom-offers`  
**Token:** Merchant Owner

```json
{
  "clientId": 5,
  "title": "Web Custom",
  "description": "Spesial diskon",
  "price": 1200000,
  "deadlineDays": 10
}
```

**Tahap 2: Klien Menerima Penawaran**  
**Endpoint:** `PATCH http://localhost:4000/api/v1/custom-offers/1/accept`  
**Token:** Client

**Tahap 3: Klien Menolak Penawaran**  
**Endpoint:** `PATCH http://localhost:4000/api/v1/custom-offers/1/reject`  
**Token:** Client

---

### FASE 5: PEMBAYARAN & VERIFIKASI KEUANGAN

Uang masuk dari Klien dan diverifikasi oleh tim internal kampus/platform.

#### 1. Klien Melakukan Pembayaran
**Endpoint:** `PATCH http://localhost:4000/api/v1/orders/1/pay`  
**Token:** Client

```json
{
  "proofUrl": "https://gdrive.com/bukti-transfer-siti.png"
}
```

**Catatan:** Endpoint ini akan mencetak nomor transaksi di database (misal: Transaction ID 1).

#### 2. Finance Memverifikasi Uang Masuk
**Endpoint:** `PATCH http://localhost:4000/api/v1/transactions/1/verify`  
**Token:** Admin Finance

```json
{
  "status": "VERIFIED"
}
```

**Catatan:** Setelah Finance ACC, status Order otomatis menjadi `IN_PROGRESS`.

---

### FASE 6: PENGERJAAN & PENYELESAIAN PESANAN

Proses pengerjaan oleh pihak Vendor/Staf hingga pesanan ditutup oleh Klien.

#### 1. Vendor Menerima dan Memulai Pekerjaan
**Endpoint:** `PATCH http://localhost:4000/api/v1/orders/1/accept`  
**Token:** Merchant Owner atau Staf Associate

#### 2. Vendor/Staf Mengirimkan Hasil Pekerjaan
**Endpoint:** `POST http://localhost:4000/api/v1/deliverables`  
**Token:** Merchant Owner atau Staf Associate

```json
{
  "orderId": 1,
  "fileUrl": "https://gdrive.com/hasil-web-final.zip",
  "message": "Halo kak, pesanan sudah selesai ya!"
}
```

#### 3. Klien Menerima Hasil dan Menutup Pesanan
**Endpoint:** `PATCH http://localhost:4000/api/v1/orders/1/complete`  
**Token:** Client

#### 4. Klien Memberikan Ulasan
**Endpoint:** `POST http://localhost:4000/api/v1/reviews`  
**Token:** Client

```json
{
  "orderId": 1,
  "rating": 5,
  "comment": "Pengerjaan sangat cepat dan rapi!"
}
```

---

### FASE 7: PENGECEKAN METRIK KEUANGAN & OPERASIONAL

Tahap validasi bahwa sistem berjalan lancar dan pembagian hak akses terjamin.

#### 1. Cek Riwayat Transaksi
**Endpoint:** `GET http://localhost:4000/api/v1/transactions/my-history`  
**Token:** Merchant Owner

#### 2. Staf Mengecek Daftar Pesanan Masuk
**Endpoint:** `GET http://localhost:4000/api/v1/orders/incoming`  
**Token:** Merchant Associate

#### 3. Admin Mengecek Semua Transaksi
**Endpoint:** `GET http://localhost:4000/api/v1/transactions/all`  
**Token:** Admin Finance

---

### FASE 8: FITUR TAMBAHAN (Opsional)

#### 1. Featured Placements / Promosi Gig
**Endpoint:** `POST http://localhost:4000/api/v1/featured-placements/promote`  
**Token:** Merchant Owner

```json
{
  "gigId": 1
}
```

**Upload Bukti Pembayaran:** `POST http://localhost:4000/api/v1/featured-placements/upload-proof/1`  
**Token:** Merchant Owner

```json
{
  "proofUrl": "https://gdrive.com/bukti-promo.png"
}
```

**Admin Approve:** `POST http://localhost:4000/api/v1/featured-placements/admin/approve/1`  
**Token:** Admin Finance

#### 2. Membuka Dispute
**Endpoint:** `POST http://localhost:4000/api/v1/disputes`  
**Token:** Client atau Merchant Owner

```json
{
  "orderId": 1,
  "reason": "Hasil tidak sesuai spesifikasi",
  "evidenceUrls": "https://gdrive.com/bukti1.png" // Optional: Link bukti dispute
}
```

**Admin Resolve Dispute:** `PATCH http://localhost:4000/api/v1/disputes/1/resolve`  
**Token:** Admin Validator

```json
{
  "decision": "REFUND",
  "verdictNote": "Pengembalian dana 50%"
}
```

---

## Catatan Penting

- Setiap fase bergantung pada fase sebelumnya. Ikuti urutan secara berurutan.
- Pastikan menyimpan token dari setiap user untuk langkah berikutnya.
- Gunakan Postman atau tools sejenis untuk testing API.
- ID user, merchant, gig, dll dapat berbeda, sesuaikan dengan response dari endpoint sebelumnya.
- Semua endpoint memerlukan autentikasi kecuali yang ditandai "No" di kolom Auth.
  "fullName": "Siti Klien",
  "role": "CLIENT"
}

// Staf Toko / Associate (ID 6)
{
  "email": "udin.staf@kampus.com",
  "passwordHash": "pass123",
  "fullName": "Udin Rajin",
  "role": "MERCHANT_ASSOCIATE"
}
```

#### 2. Login & Dapatkan Token
**Endpoint:** `POST http://localhost:4000/api/v1/auth/login`

```json
{
  "email": "vendor@kampus.com",
  "password": "pass123"
}
```

**Catatan:** Login ke semua akun untuk mendapatkan token masing-masing user.

---

### FASE 2: SETUP SISTEM & TOKO VENDOR

Persiapan sebelum Vendor bisa berjualan.

#### 1. Pembuatan Kategori Jasa
**Endpoint:** `POST http://localhost:4000/api/v1/categories`  
**Token:** Super Admin

```json
{
  "name": "Web & IT Development",
  "commissionRate": 5.5
}
```

#### 2. Pembuatan Profil Toko
**Endpoint:** `POST http://localhost:4000/api/v1/merchants`  
**Token:** Merchant Owner

```json
{
  "shopName": "Budi Tech Studio",
  "description": "Bikin web cepat, murah, aman."
}
```

#### 3. Upload Dokumen Verifikasi / KYB
**Endpoint:** `PATCH http://localhost:4000/api/v1/merchants/submit-kyb`  
**Token:** Merchant Owner

```json
{
  "kybDocuments": "https://gdrive.com/ktm-budi.pdf",
  "portfolioUrl": "document cv"
}
```

#### 4. Admin Memvalidasi Toko
**Endpoint:** `PATCH http://localhost:4000/api/v1/admin/validator/merchants/1/verify`  
**Token:** Admin Validator

**Jika Terima:**
```json
{
  "status": "ACTIVE"
}
```

**Jika Tolak:**
```json
{
  "status": "REJECTED",
  "rejectionReason": "Foto KTM buram."
}
```

#### 5. Vendor Mendaftarkan Rekening Pencairan
**Endpoint:** `POST http://localhost:4000/api/v1/bank-accounts`  
**Token:** Merchant Owner

```json
{
  "bankName": "Bank Mandiri",
  "accountNumber": "1300012345678",
  "accountHolderName": "Budi Santoso",
  "isPrimary": true
}
```

---

### FASE 3: MANAJEMEN KARYAWAN & ETALASE

Melibatkan staf untuk membantu mengelola toko dan memajang jasa di etalase.

#### 1. Bos Merekrut Staf ke Toko
**Endpoint:** `POST http://localhost:4000/api/v1/merchant-associates`  
**Token:** Merchant Owner

```json
{
  "merchantId": 1,
  "email": "udin.staf@kampus.com",
  "permission": "FULL_ACCESS"
}
```

#### 2. Membuat Etalase Jasa / Gigs
**Endpoint:** `POST http://localhost:4000/api/v1/gigs`  
**Token:** Merchant Owner atau Staf Associate

```json
{
  "merchantId": 1,
  "categoryId": 1,
  "title": "Jasa Pembuatan Web Company Profile",
  "description": "Website elegan dan responsif.",
  "price": 2500000,
  "status": "PUBLISHED"
}
```

---

### FASE 4: PEMESANAN JASA

Pembeli memiliki dua metode untuk memesan jasa.

#### OPSI A: Jalur Pembelian Langsung (Direct Order)
**Endpoint:** `POST http://localhost:4000/api/v1/orders`  
**Token:** Client

```json
{
  "gigId": 1
}
```

#### OPSI B: Jalur Negosiasi (Custom Offer)

**Tahap 1: Vendor Mengirim Penawaran**  
**Endpoint:** `POST http://localhost:4000/api/v1/custom-offers`  
**Token:** Merchant Owner

```json
{
  "clientId": 5,
  "title": "Web Custom",
  "description": "Spesial diskon",
  "price": 1200000,
  "deadlineDays": 10
}
```

**Tahap 2: Klien Menerima Penawaran**  
**Endpoint:** `PATCH http://localhost:4000/api/v1/custom-offers/1/accept`  
**Token:** Client

---

### FASE 5: PEMBAYARAN & VERIFIKASI KEUANGAN

Uang masuk dari Klien dan diverifikasi oleh tim internal kampus/platform.

#### 1. Klien Melakukan Pembayaran
**Endpoint:** `PATCH http://localhost:4000/api/v1/orders/1/pay`  
**Token:** Client

```json
{
  "proofUrl": "https://gdrive.com/bukti-transfer-siti.png"
}
```

**Catatan:** Endpoint ini akan mencetak nomor transaksi di database (misal: Transaction ID 1).

#### 2. Finance Memverifikasi Uang Masuk
**Endpoint:** `PATCH http://localhost:4000/api/v1/transactions/1/verify`  
**Token:** Admin Finance

```json
{
  "status": "VERIFIED"
}
```

**Catatan:** Setelah Finance ACC, status Order otomatis menjadi `IN_PROGRESS`.

---
