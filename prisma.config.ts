import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'npx ts-node -r dotenv/config prisma/seed.ts',
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});