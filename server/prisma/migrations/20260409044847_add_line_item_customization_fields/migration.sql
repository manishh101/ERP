-- AlterTable
ALTER TABLE "so_line_items" ADD COLUMN     "customization_notes" TEXT,
ADD COLUMN     "fabric_color" TEXT,
ADD COLUMN     "is_custom" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "wood_finish" TEXT;
