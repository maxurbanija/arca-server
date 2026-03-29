import "dotenv/config";
import path from "node:path";
import { defineConfig } from "prisma/config";

export default defineConfig({
  earlyAccess: true,
  schema: path.join(__dirname, "prisma", "schema.prisma"),
  migrate: {
    async resolve({ url }) {
      return url ?? process.env.DATABASE_URL!;
    },
  },
  datasource: {
    url: process.env.DATABASE_URL!,
  },
});
