import 'dotenv/config';
import {
  PrismaClient,
  Role,
  MerchantStatus,
  AssociatePermission,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

console.log("DB URL IS: ", process.env.DATABASE_URL);

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool as any);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Start seeding...');

  const passwordHash = await bcrypt.hash('password123', 10);

  // 1. SUPER_ADMIN
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
  console.log(`Created user: ${superAdmin.email} (SUPER_ADMIN)`);

  // 2. ADMIN_VALIDATOR
  const validatorAdmin = await prisma.user.upsert({
    where: { email: 'validator@test.com' },
    update: {},
    create: {
      email: 'validator@test.com',
      passwordHash,
      fullName: 'Validator Admin',
      role: Role.ADMIN_VALIDATOR,
    },
  });
  console.log(`Created user: ${validatorAdmin.email} (ADMIN_VALIDATOR)`);

  // 3. ADMIN_FINANCE
  const financeAdmin = await prisma.user.upsert({
    where: { email: 'finance@test.com' },
    update: {},
    create: {
      email: 'finance@test.com',
      passwordHash,
      fullName: 'Finance Admin',
      role: Role.ADMIN_FINANCE,
    },
  });
  console.log(`Created user: ${financeAdmin.email} (ADMIN_FINANCE)`);

  // 4. CLIENT
  const clientUser = await prisma.user.upsert({
    where: { email: 'client@test.com' },
    update: {},
    create: {
      email: 'client@test.com',
      passwordHash,
      fullName: 'Regular Client',
      role: Role.CLIENT,
    },
  });
  console.log(`Created user: ${clientUser.email} (CLIENT)`);

  // 5. MERCHANT_OWNER
  const merchantOwner = await prisma.user.upsert({
    where: { email: 'merchant@test.com' },
    update: {},
    create: {
      email: 'merchant@test.com',
      passwordHash,
      fullName: 'Merchant Owner',
      role: Role.MERCHANT_OWNER,
      merchant: {
        create: {
          shopName: 'Toko Sejahtera',
          description: 'Toko serba ada yang sejahtera',
          status: MerchantStatus.ACTIVE,
          walletBalance: 1000000,
          withdrawalPin: '123456',
        },
      },
    },
  });
  console.log(
    `Created user: ${merchantOwner.email} (MERCHANT_OWNER) with Merchant Store`,
  );

  // Dapatkan ID Merchant yang baru dibuat
  const merchantStore = await prisma.merchant.findUnique({
    where: { userId: merchantOwner.id },
  });

  // 6. MERCHANT_ASSOCIATE
  if (merchantStore) {
    const merchantAssociate = await prisma.user.upsert({
      where: { email: 'associate@test.com' },
      update: {},
      create: {
        email: 'associate@test.com',
        passwordHash,
        fullName: 'Merchant Staff',
        role: Role.MERCHANT_ASSOCIATE,
        merchantAssociates: {
          create: {
            merchantId: merchantStore.id,
            permission: AssociatePermission.FULL_ACCESS,
          },
        },
      },
    });
    console.log(
      `Created user: ${merchantAssociate.email} (MERCHANT_ASSOCIATE)`,
    );
  }

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
