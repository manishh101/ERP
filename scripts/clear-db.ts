import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Connecting to database to clear tables...");
  
  // Fetch all tables in the public schema except 'users' and migrations
  const tables: { table_name: string }[] = await prisma.$queryRaw`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_name != 'users' 
      AND table_name != '_prisma_migrations';
  `;

  const tableNames = tables.map((t) => `"${t.table_name}"`).join(", ");

  if (tableNames.length > 0) {
    console.log(`Tables to truncate: ${tableNames}`);
    // Truncate all tables using RESTART IDENTITY and CASCADE
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tableNames} RESTART IDENTITY CASCADE;`);
    console.log("Database cleared successfully, preserving only users!");
  } else {
    console.log("No tables found to clear.");
  }
}

main()
  .catch((e) => {
    console.error("Error clearing database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
