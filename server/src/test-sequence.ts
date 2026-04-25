import { PrismaClient } from '@prisma/client'
import { nextEstimateNumber, nextInvoiceNumber } from './shared/invoice-seq.util'

const prisma = new PrismaClient()

async function main() {
  const est1 = await nextEstimateNumber(prisma, "2081/82")
  const inv1 = await nextInvoiceNumber(prisma, "2081/82")
  const est2 = await nextEstimateNumber(prisma, "2081/82")
  
  console.log({ est1, inv1, est2 })
}

main().catch(e => {
  console.error(e)
  process.exit(1)
}).finally(async () => {
  await prisma.$disconnect()
})
