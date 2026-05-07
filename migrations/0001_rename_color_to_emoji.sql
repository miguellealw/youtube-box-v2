ALTER TABLE "category" RENAME COLUMN "color" TO "emoji";
-- Clear any leftover hex color values stored before migration
UPDATE "category" SET "emoji" = NULL WHERE "emoji" LIKE '#%';
