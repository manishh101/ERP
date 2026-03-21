-- CreateTable
CREATE TABLE "receipt_counters" (
    "id" TEXT NOT NULL,
    "fiscal_year" TEXT NOT NULL,
    "last_seq" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "receipt_counters_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "receipt_counters_fiscal_year_key" ON "receipt_counters"("fiscal_year");
