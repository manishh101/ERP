-- AlterTable
ALTER TABLE "products" ADD COLUMN     "image_urls" TEXT[] DEFAULT ARRAY[]::TEXT[];
