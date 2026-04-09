/*
  Warnings:

  - The values [TRADE,CONTRACTOR] on the enum `CustomerType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "CustomerType_new" AS ENUM ('RETAIL', 'SHOWROOM');
ALTER TABLE "customers" ALTER COLUMN "type" TYPE "CustomerType_new" USING ("type"::text::"CustomerType_new");
ALTER TYPE "CustomerType" RENAME TO "CustomerType_old";
ALTER TYPE "CustomerType_new" RENAME TO "CustomerType";
DROP TYPE "public"."CustomerType_old";
COMMIT;
