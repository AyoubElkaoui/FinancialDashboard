-- Add AV_KOSTREG_2 category totals to rm_project_summary for A/M/O toggles on overview
ALTER TABLE "rm_project_summary" ADD COLUMN "kosten_a_categ" DECIMAL(15,2) NOT NULL DEFAULT 0;
ALTER TABLE "rm_project_summary" ADD COLUMN "kosten_m_categ" DECIMAL(15,2) NOT NULL DEFAULT 0;
ALTER TABLE "rm_project_summary" ADD COLUMN "kosten_o_categ" DECIMAL(15,2) NOT NULL DEFAULT 0;
