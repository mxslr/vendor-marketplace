import 'dotenv/config';
import {
  PrismaClient,
  Role,
  MerchantStatus,
  MerchantBadge,
  GigStatus,
  AssociatePermission,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

// Use direct URL for seeding to avoid pgbouncer restrictions
const pool = new Pool({ connectionString: process.env.DIRECT_URL });
const adapter = new PrismaPg(pool as any);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('\n🌱 Starting seed...\n');

  const passwordHash = await bcrypt.hash('Test1234!', 10);
  const pinHash = await bcrypt.hash('123456', 10);

  // ─── USERS ───────────────────────────────────────────────────────────────────

  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@test.com' },
    update: {},
    create: {
      email: 'superadmin@test.com',
      passwordHash,
      fullName: 'Super Admin',
      role: Role.SUPER_ADMIN,
    },
  });

  const validator = await prisma.user.upsert({
    where: { email: 'validator@test.com' },
    update: {},
    create: {
      email: 'validator@test.com',
      passwordHash,
      fullName: 'Admin Validator',
      role: Role.ADMIN_VALIDATOR,
    },
  });

  const finance = await prisma.user.upsert({
    where: { email: 'finance@test.com' },
    update: {},
    create: {
      email: 'finance@test.com',
      passwordHash,
      fullName: 'Finance Admin',
      role: Role.ADMIN_FINANCE,
    },
  });

  const clientUser = await prisma.user.upsert({
    where: { email: 'client@test.com' },
    update: {},
    create: {
      email: 'client@test.com',
      passwordHash,
      fullName: 'Client User',
      role: Role.CLIENT,
    },
  });

  const merchantOwner = await prisma.user.upsert({
    where: { email: 'merchant@test.com' },
    update: {},
    create: {
      email: 'merchant@test.com',
      passwordHash,
      fullName: 'Merchant Owner',
      role: Role.MERCHANT_OWNER,
    },
  });

  console.log('✅ Users');
  console.log(`   superadmin@test.com  → SUPER_ADMIN     (id: ${superAdmin.id})`);
  console.log(`   validator@test.com   → ADMIN_VALIDATOR (id: ${validator.id})`);
  console.log(`   finance@test.com     → ADMIN_FINANCE   (id: ${finance.id})`);
  console.log(`   merchant@test.com    → MERCHANT_OWNER  (id: ${merchantOwner.id})`);
  console.log(`   client@test.com      → CLIENT          (id: ${clientUser.id})`);

  // ─── MERCHANT ────────────────────────────────────────────────────────────────

  const merchant = await prisma.merchant.upsert({
    where: { userId: merchantOwner.id },
    update: {},
    create: {
      userId: merchantOwner.id,
      shopName: 'Toko Test CCI',
      description: 'Toko untuk keperluan testing sistem vendor marketplace CCI',
      status: MerchantStatus.ACTIVE,
      badge: MerchantBadge.NEWCOMER,
      walletBalance: 500000,
      withdrawalPin: pinHash,
    },
  });

  console.log(`\n✅ Merchant`);
  console.log(`   "Toko Test CCI" (id: ${merchant.id})`);
  console.log(`   status: ACTIVE | walletBalance: Rp 500.000`);

  // ─── BANK ACCOUNT ─────────────────────────────────────────────────────────────

  const existingBank = await prisma.bankAccount.findFirst({
    where: { merchantId: merchant.id, accountNumber: '1234567890' },
  });

  if (!existingBank) {
    await prisma.bankAccount.create({
      data: {
        merchantId: merchant.id,
        bankName: 'BCA',
        accountNumber: '1234567890',
        accountHolderName: 'Merchant Owner',
        isPrimary: true,
      },
    });
  }

  console.log(`   bank: BCA 1234567890`);

  // ─── CATEGORIES ──────────────────────────────────────────────────────────────

  const categoryData = [
    { name: 'Creative Studio',          commissionRate: 5 },
    { name: 'Tech and Digital',         commissionRate: 5 },
    { name: 'Event Essentials',         commissionRate: 3 },
    { name: 'Consumptions',             commissionRate: 3 },
    { name: 'Merchandise and Apparels', commissionRate: 4 },
    { name: 'Talents and Performers',   commissionRate: 5 },
  ];

  const categories: Record<string, number> = {};

  for (const cat of categoryData) {
    const existing = await prisma.category.findFirst({ where: { name: cat.name } });
    if (existing) {
      categories[cat.name] = existing.id;
    } else {
      const created = await prisma.category.create({
        data: { name: cat.name, commissionRate: cat.commissionRate },
      });
      categories[cat.name] = created.id;
    }
  }

  console.log(`\n✅ Categories`);
  for (const cat of categoryData) {
    console.log(`   ${cat.name.padEnd(28)} (${cat.commissionRate}%) → id: ${categories[cat.name]}`);
  }

  // ─── GIG ─────────────────────────────────────────────────────────────────────

  const creativeStudioId = categories['Creative Studio'];

  const existingGig = await prisma.gig.findFirst({
    where: { merchantId: merchant.id, title: 'Jasa Desain Logo' },
  });

  const gig = existingGig ?? await prisma.gig.create({
    data: {
      merchantId: merchant.id,
      categoryId: creativeStudioId,
      title: 'Jasa Desain Logo',
      description: 'Desain logo profesional untuk acara kampus',
      price: 150000,
      status: GigStatus.ACTIVE,
    },
  });

  console.log(`\n✅ Gig`);
  console.log(`   "Jasa Desain Logo" (id: ${gig.id})`);
  console.log(`   category: Creative Studio | price: Rp 150.000 | status: ACTIVE`);

  // ─── MERCHANT ASSOCIATE ──────────────────────────────────────────────────────

  const associate = await prisma.user.upsert({
    where: { email: 'associate@test.com' },
    update: {},
    create: {
      email: 'associate@test.com',
      passwordHash,
      fullName: 'Merchant Associate',
      role: Role.MERCHANT_ASSOCIATE,
    },
  });

  await prisma.merchantAssociate.upsert({
    where: { merchantId_userId: { merchantId: merchant.id, userId: associate.id } },
    update: {},
    create: {
      merchantId: merchant.id,
      userId: associate.id,
      permission: AssociatePermission.FULL_ACCESS,
    },
  });

  console.log(`\n✅ Merchant Associate`);
  console.log(`   associate@test.com → MERCHANT_ASSOCIATE | FULL_ACCESS (id: ${associate.id})`);

  // ─── SUMMARY ─────────────────────────────────────────────────────────────────

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Seed complete. Credentials (all: Test1234!)');
  console.log('  superadmin@test.com  SUPER_ADMIN');
  console.log('  validator@test.com   ADMIN_VALIDATOR');
  console.log('  finance@test.com     ADMIN_FINANCE');
  console.log('  merchant@test.com    MERCHANT_OWNER');
  console.log('  associate@test.com   MERCHANT_ASSOCIATE');
  console.log('  client@test.com      CLIENT');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
