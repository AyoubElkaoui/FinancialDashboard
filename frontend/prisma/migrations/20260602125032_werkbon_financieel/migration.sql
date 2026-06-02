/*
  Warnings:

  - You are about to drop the column `alg_kosten_handm` on the `rm_werkbon` table. All the data in the column will be lost.
  - You are about to drop the column `b_marge_handm` on the `rm_werkbon` table. All the data in the column will be lost.
  - You are about to drop the column `indirect_handm` on the `rm_werkbon` table. All the data in the column will be lost.
  - You are about to drop the column `kosten_handm` on the `rm_werkbon` table. All the data in the column will be lost.
  - You are about to drop the column `opbrengsten_handm` on the `rm_werkbon` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "rm_werkbon" DROP COLUMN "alg_kosten_handm",
DROP COLUMN "b_marge_handm",
DROP COLUMN "indirect_handm",
DROP COLUMN "kosten_handm",
DROP COLUMN "opbrengsten_handm",
ADD COLUMN     "opbrengsten" DECIMAL(12,2),
ADD COLUMN     "streefmarge_pct" DECIMAL(5,2),
ADD COLUMN     "uren_werkbon" DECIMAL(10,2);
