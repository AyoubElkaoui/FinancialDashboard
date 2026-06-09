-- CreateTable
CREATE TABLE "rm_kosten_regel" (
    "id" TEXT NOT NULL,
    "database" "Database" NOT NULL,
    "project_nr" TEXT NOT NULL,
    "type_breg" TEXT NOT NULL,
    "categorie" TEXT NOT NULL,
    "datum" DATE,
    "omschrijving" TEXT,
    "bedrag" DECIMAL(15,2),
    "dekkingen" DECIMAL(15,2),
    "factuur_status" TEXT,
    "doc_code" TEXT,
    "cre_naam" TEXT,

    CONSTRAINT "rm_kosten_regel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "rm_kosten_regel_database_project_nr_idx" ON "rm_kosten_regel"("database", "project_nr");
