import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const p = await prisma.product.findFirst({
    where: { name: { contains: '72 Daraj -SR' } },
    include: { variants: true }
  });
  console.log(p?.name, p?.sellingPrice, p?.variants);
}
main();
