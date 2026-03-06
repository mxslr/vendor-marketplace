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
  "kybDocuments": "https://gdrive.com/ktm-budi.pdf"
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

### FASE 6: PENGERJAAN & PENYELESAIAN PESANAN

Proses pengerjaan oleh pihak Vendor/Staf hingga pesanan ditutup oleh Klien.

#### 1. Vendor Menerima dan Memulai Pekerjaan
**Endpoint:** `PATCH http://localhost:4000/api/v1/orders/1/accept`  
**Token:** Merchant Owner atau Staf Associate

Body: (Kosong)

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

Body: (Kosong)

**Catatan:** Sistem otomatis mentransfer dana dari escrow ke Dompet Toko/Wallet Balance.

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

#### 1. Cek Saldo Dompet Masuk
**Endpoint:** `GET http://localhost:4000/api/v1/merchants/me`  
**Token:** Merchant Owner (Si Budi)

#### 2. Staf Mengecek Daftar Pesanan
**Endpoint:** `GET http://localhost:4000/api/v1/orders/incoming`  
**Token:** Merchant Associate (Staf Udin)

---

## Catatan Penting

- Setiap fase bergantung pada fase sebelumnya. Ikuti urutan secara berurutan.
- Pastikan menyimpan token dari setiap user untuk langkah berikutnya.
- Gunakan Postman atau tools sejenis untuk testing API.
- ID user dan merchant dapat berbeda, sesuaikan dengan response dari endpoint sebelumnya.
